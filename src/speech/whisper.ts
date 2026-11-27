import { captureUrl, prepareSpeechRuntime, wasmPaths, workerUrl } from './speech-assets'
import type { ModelProgress, ModelSize, SpeechCallbacks, SpeechError, SpeechLanguage, SpeechSource } from './types'
import type { CaptureMessage, ModelWeight, WhisperRequest, WhisperResponse } from './whisper-protocol'

export class WhisperSpeechSource implements SpeechSource {
  private worker?: Worker
  private context?: AudioContext
  private stream?: MediaStream
  private input?: MediaStreamAudioSourceNode
  private capture?: AudioWorkletNode
  private callbacks?: SpeechCallbacks
  private download?: AbortController
  private workerReady = false
  private transcribing = false
  private pending?: Float32Array<ArrayBuffer>

  constructor(private readonly language: SpeechLanguage, private readonly size: ModelSize = 'base') {}

  start(callbacks: SpeechCallbacks) {
    this.stop()
    this.callbacks = callbacks
    try {
      this.context = new AudioContext()
      // Unlock audio while the start button's user gesture is still active.
      void this.context.resume().catch(() => {})
    } catch {
      this.fail('microphone')
      return
    }
    const download = new AbortController()
    this.download = download
    void this.prepare(download.signal, callbacks)
  }

  stop() {
    this.callbacks = undefined
    this.download?.abort()
    this.download = undefined
    const stream = this.stream
    this.stream = undefined
    stream?.getTracks().forEach(track => track.stop())
    this.capture?.port.close()
    this.capture?.disconnect()
    this.capture = undefined
    this.input?.disconnect()
    this.input = undefined
    const context = this.context
    this.context = undefined
    if (context) void context.close().catch(() => {})
    this.worker?.terminate()
    this.worker = undefined
    this.workerReady = false
    this.transcribing = false
    this.pending?.fill(0)
    this.pending = undefined
  }

  private fail(error: SpeechError) {
    const callbacks = this.callbacks
    this.stop()
    callbacks?.onError(error)
  }

  private async prepare(signal: AbortSignal, callbacks: SpeechCallbacks) {
    try {
      const { runtime, weights } = await prepareSpeechRuntime(this.size, signal, progress => callbacks.onProgress(progress))
      this.loadWorker(true, runtime, weights)
    } catch {
      if (!signal.aborted) this.fail('model')
    }
  }

  private loadWorker(preferGpu: boolean, runtime: ModelProgress, weights: ModelWeight[]) {
    this.worker?.terminate()
    this.workerReady = false
    this.transcribing = false
    const worker = new Worker(workerUrl, { type: 'module' })
    this.worker = worker
    worker.onerror = event => {
      event.preventDefault()
      if (this.worker === worker) this.fail(this.workerReady ? 'transcription' : 'model')
    }
    worker.onmessage = (event: MessageEvent<WhisperResponse>) => {
      const callbacks = this.callbacks
      if (!callbacks || this.worker !== worker) return
      const message = event.data
      switch (message.type) {
        case 'progress':
          if (!this.stream) callbacks.onProgress({
            loaded: runtime.loaded + message.progress.loaded,
            total: runtime.total + message.progress.total,
          })
          break
        case 'ready':
          this.workerReady = true
          callbacks.onMetrics(message.metrics)
          if (!this.stream) void this.openMicrophone(callbacks)
          else this.sendPending()
          break
        case 'result':
          this.transcribing = false
          callbacks.onMetrics(message.metrics)
          if (message.text) callbacks.onFinal(message.text)
          this.sendPending()
          break
        case 'error':
          if (message.backend === 'webgpu' && preferGpu) {
            // ONNX retains failed initialization state. Retry in a fresh worker.
            try {
              this.loadWorker(false, runtime, weights)
            } catch {
              this.fail(message.phase)
            }
          } else {
            this.fail(message.phase)
          }
          break
      }
    }
    worker.postMessage({
      type: 'load', size: this.size, language: this.language, preferGpu, weights, wasmPaths,
    } satisfies WhisperRequest)
  }

  private async openMicrophone(callbacks: SpeechCallbacks) {
    const context = this.context
    if (!context) return
    try {
      await context.audioWorklet.addModule(captureUrl)
      if (this.callbacks !== callbacks) return
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: false },
      })
      if (this.callbacks !== callbacks) {
        stream.getTracks().forEach(track => track.stop())
        return
      }
      this.stream = stream
      callbacks.onMicrophone(true)
      for (const track of stream.getAudioTracks()) {
        track.addEventListener('ended', () => {
          if (this.stream === stream) this.fail('microphone')
        })
      }
      const input = context.createMediaStreamSource(stream)
      const capture = new AudioWorkletNode(context, 'call-audio', { channelCount: 1, channelCountMode: 'explicit' })
      this.input = input
      this.capture = capture
      capture.onprocessorerror = () => { if (this.capture === capture) this.fail('microphone') }
      capture.port.onmessage = (event: MessageEvent<CaptureMessage>) => {
        if (this.capture !== capture) return
        const message = event.data
        if (message.type === 'activity') callbacks.onActivity()
        else {
          // Bound the backlog on slow phones. Keep the most recent waiting chunk.
          this.pending?.fill(0)
          this.pending = message.samples
          this.sendPending()
        }
      }
      input.connect(capture).connect(context.destination)
      callbacks.onReady()
      await context.resume()
    } catch (error) {
      if (this.callbacks !== callbacks) return
      this.fail(error instanceof DOMException && error.name === 'NotAllowedError' ? 'permission' : 'microphone')
    }
  }

  private sendPending() {
    const samples = this.pending
    if (!samples || !this.workerReady || !this.worker || this.transcribing) return
    this.pending = undefined
    this.transcribing = true
    this.worker.postMessage({ type: 'audio', samples } satisfies WhisperRequest, [samples.buffer])
  }
}
