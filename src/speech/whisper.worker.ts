import { env, pipeline, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers'
import { AUDIO_SAMPLE_RATE, WHISPER_MODEL_HOST, whisperModelId, type WhisperRequest, type WhisperResponse } from './whisper-protocol'
import type { SpeechLanguage, SpeechMetrics } from './types'

// Transformers.js can include input tensors in diagnostics when inference fails.
// This worker reports fixed error codes instead.
const discardDiagnostic = () => {}
Object.assign(self.console, {
  debug: discardDiagnostic,
  error: discardDiagnostic,
  info: discardDiagnostic,
  log: discardDiagnostic,
  warn: discardDiagnostic,
})

env.remoteHost = WHISPER_MODEL_HOST
env.allowLocalModels = false
env.useBrowserCache = true

let transcriber: AutomaticSpeechRecognitionPipeline | undefined
let language: SpeechLanguage
let metrics: SpeechMetrics

function send(message: WhisperResponse) {
  self.postMessage(message)
}

async function load(request: Extract<WhisperRequest, { type: 'load' }>) {
  const started = performance.now()
  const backend = request.preferGpu && 'gpu' in navigator ? 'webgpu' : 'wasm'
  const model = whisperModelId(request.size)
  try {
    const wasm = env.backends.onnx?.wasm
    if (wasm) {
      wasm.numThreads = 1
      wasm.proxy = false
      wasm.wasmPaths = {
        wasm: new URL(request.wasmPaths.wasm, self.location.origin).href,
        mjs: new URL(request.wasmPaths.mjs, self.location.origin).href,
      }
    }
    const sizes = new Map(request.weights.map(({ file, bytes }) => [file, bytes]))
    const loaded = new Map<string, number>()
    let lastReport = -Infinity
    function reportProgress() {
      const total = Array.from(sizes.values()).reduce((sum, bytes) => sum + bytes, 0)
      const now = performance.now()
      if (total === 0 || now - lastReport < 100) return
      lastReport = now
      send({ type: 'progress', progress: {
        total,
        loaded: Array.from(loaded.values()).reduce((sum, bytes) => sum + bytes, 0),
      } })
    }
    reportProgress()
    transcriber = await pipeline<'automatic-speech-recognition'>('automatic-speech-recognition', model, {
      device: backend,
      dtype: 'q8',
      progress_callback: progress => {
        if (progress.status !== 'progress' || !sizes.has(progress.file)) return
        if (progress.total > 0) sizes.set(progress.file, progress.total)
        loaded.set(progress.file, progress.loaded)
        reportProgress()
      },
    })
    env.allowRemoteModels = false
    language = request.language
    metrics = { backend, loadMs: performance.now() - started }
    send({ type: 'ready', metrics })
  } catch {
    send({ type: 'error', phase: 'model', backend })
  }
}

async function transcribe(samples: Float32Array) {
  if (!transcriber) return
  const started = performance.now()
  try {
    const result = await transcriber(samples, { language, task: 'transcribe', max_new_tokens: 64 })
    const output = Array.isArray(result) ? result[0] : result
    send({
      type: 'result',
      text: output?.text.trim() ?? '',
      metrics: {
        ...metrics,
        audioSeconds: samples.length / AUDIO_SAMPLE_RATE,
        transcriptionMs: performance.now() - started,
      },
    })
  } catch {
    send({ type: 'error', phase: 'transcription', backend: metrics.backend })
  } finally {
    samples.fill(0)
  }
}

self.addEventListener('message', (event: MessageEvent<WhisperRequest>) => {
  const request = event.data
  if (request.type === 'load') void load(request)
  else void transcribe(request.samples)
})
