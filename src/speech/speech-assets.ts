import wasmUrl from '../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.wasm?url'
import wasmModuleUrl from '../../node_modules/@huggingface/transformers/dist/ort-wasm-simd-threaded.jsep.mjs?url'
import captureUrl from './capture.worklet?worker&url'
import workerUrl from './whisper.worker?worker&url'
import { WHISPER_MODEL_HOST, whisperModelId, type ModelWeight, type WasmPaths } from './whisper-protocol'
import type { ModelProgress, ModelSize } from './types'

export { captureUrl, workerUrl }
export const wasmPaths: WasmPaths = { wasm: wasmUrl, mjs: wasmModuleUrl }

const runtimeCache = 'callguard-speech-runtime'
const runtimeFiles = [
  { url: workerUrl, bytes: 880_000 },
  { url: captureUrl, bytes: 2_000 },
  { url: wasmUrl, bytes: 21_596_019 },
  { url: wasmModuleUrl, bytes: 44_484 },
]

const weightSizes: Record<ModelSize, [encoderMB: number, decoderMB: number]> = {
  tiny: [10.1, 30.7],
  base: [23.2, 53.7],
  small: [92.3, 157],
}

export async function missingModelWeights(size: ModelSize): Promise<ModelWeight[]> {
  const [encoderMB, decoderMB] = weightSizes[size]
  const weights = [
    { file: 'onnx/encoder_model_quantized.onnx', bytes: encoderMB * 1_000_000 },
    { file: 'onnx/decoder_model_merged_quantized.onnx', bytes: decoderMB * 1_000_000 },
  ]
  try {
    const base = `${WHISPER_MODEL_HOST}${whisperModelId(size)}/resolve/main/`
    const found = await Promise.all(weights.map(({ file }) => caches.match(base + file, { cacheName: 'transformers-cache' })))
    return weights.filter((_, index) => !found[index])
  } catch {
    return weights
  }
}

async function openRuntimeCache() {
  try {
    return await caches.open(runtimeCache)
  } catch {
    return undefined
  }
}

export async function downloadSpeechRuntime(signal: AbortSignal, onProgress: (progress: ModelProgress) => void) {
  const empty = { loaded: 0, total: 0 }
  if (import.meta.env.DEV) return empty

  const cache = await openRuntimeCache()
  const files = await Promise.all(runtimeFiles.map(async ({ url: asset, bytes }) => {
    const url = new URL(asset, location.href)
    if (url.origin !== location.origin) throw new Error('Unexpected speech asset origin')
    const cached = await cache?.match(url.href).catch(() => undefined)
    return { url: url.href, loaded: 0, total: cached ? 0 : bytes }
  }))
  signal.throwIfAborted()

  const missing = files.filter(file => file.total > 0)
  const totals = () => missing.reduce((sum, { loaded, total }) => ({
    loaded: sum.loaded + loaded,
    total: sum.total + total,
  }), empty)
  if (!missing.length) return empty

  let lastReport = -Infinity
  function report() {
    const now = performance.now()
    if (now - lastReport < 100) return
    lastReport = now
    onProgress(totals())
  }
  report()

  await Promise.all(missing.map(async file => {
    const { url } = file
    // Before the service worker claims the first page, seed the same runtime cache.
    const seedCache = navigator.serviceWorker?.controller ? undefined : cache
    const response = await fetch(url, { signal, credentials: 'omit', mode: 'same-origin', redirect: 'error' })
    if (!response.ok || !response.body) throw new Error('Speech asset unavailable')
    const stored = seedCache?.put(url, response.clone()).catch(() => {})
    const length = Number(response.headers.get('content-length'))
    if (length > 0 && !response.headers.get('content-encoding')) file.total = length
    const reader = response.body.getReader()
    try {
      for (;;) {
        const { value, done } = await reader.read()
        if (done) break
        file.loaded += value.byteLength
        file.total = Math.max(file.total, file.loaded)
        report()
      }
      file.total = file.loaded
      await stored
    } finally {
      reader.releaseLock()
    }
  }))
  const progress = totals()
  onProgress(progress)
  return progress
}
