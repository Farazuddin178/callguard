import { clipChunks } from './clip-audio'
import { prepareSpeechRuntime, wasmPaths, workerUrl } from './speech-assets'
import type { ModelProgress, ModelSize } from './types'
import type { WhisperLanguage, WhisperRequest, WhisperResponse } from './whisper-protocol'

function exchange<T extends 'ready' | 'result'>(worker: Worker, request: WhisperRequest, expected: T,
  signal: AbortSignal, progress: (value: ModelProgress) => void,
): Promise<Extract<WhisperResponse, { type: T }>> {
  return new Promise((resolve, reject) => {
    signal.throwIfAborted()
    function clean() {
      signal.removeEventListener('abort', aborted)
      worker.removeEventListener('message', receive)
      worker.removeEventListener('error', failed)
    }
    function aborted() {
      clean()
      reject(signal.reason)
    }
    function failed(event: ErrorEvent) {
      event.preventDefault()
      clean()
      reject(new Error('Worker unavailable'))
    }
    function receive({ data }: MessageEvent<WhisperResponse>) {
      if (data.type === 'progress') progress(data.progress)
      if (data.type === 'error') {
        clean()
        reject(new Error(data.backend))
      }
      if (data.type === expected) {
        clean()
        resolve(data as Extract<WhisperResponse, { type: T }>)
      }
    }
    signal.addEventListener('abort', aborted, { once: true })
    worker.addEventListener('message', receive)
    worker.addEventListener('error', failed)
    try {
      worker.postMessage(request, request.type === 'audio' ? [request.samples.buffer] : [])
    } catch (error) {
      clean()
      if (request.type === 'audio' && request.samples.byteLength) request.samples.fill(0)
      reject(error)
    }
  })
}

export async function transcribeClip(samples: Float32Array, language: WhisperLanguage, size: ModelSize,
  signal: AbortSignal, callbacks: { progress: (value: ModelProgress) => void; ready: () => void; words: (text: string) => void },
  modelId?: string,
) {
  const { runtime, weights } = await prepareSpeechRuntime(size, signal, callbacks.progress, modelId)
  const report = ({ loaded, total }: ModelProgress) => callbacks.progress({
    loaded: runtime.loaded + loaded, total: runtime.total + total,
  })
  let worker: Worker | undefined
  async function load(preferGpu: boolean) {
    signal.throwIfAborted()
    worker?.terminate()
    const next = new Worker(workerUrl, { type: 'module' })
    worker = next
    await exchange(next, { type: 'load', size, modelId, language, preferGpu, weights, wasmPaths }, 'ready', signal, report)
    return next
  }
  try {
    let active: Worker
    let preferGpu = 'gpu' in navigator
    try {
      active = await load(preferGpu)
    } catch (error) {
      if (!preferGpu || signal.aborted) throw error
      preferGpu = false
      active = await load(false)
    }
    callbacks.ready()
    for (const chunk of clipChunks(samples)) {
      const send = () => exchange(active, { type: 'audio', samples: new Float32Array(chunk) }, 'result', signal, report)
      let result
      try {
        result = await send()
      } catch (error) {
        if (!preferGpu || signal.aborted) throw error
        preferGpu = false
        active = await load(false)
        result = await send()
      }
      chunk.fill(0)
      if (result.text) callbacks.words(result.text)
    }
  } finally {
    worker?.terminate()
    samples.fill(0)
  }
}
