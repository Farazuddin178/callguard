import type { ModelProgress, ModelSize, SpeechLanguage, SpeechMetrics } from './types'

export const AUDIO_SAMPLE_RATE = 16_000
export const AUDIO_CHUNK_SECONDS = 4
export const WHISPER_MODEL_HOST = 'https://huggingface.co/'
export const whisperModelId = (size: ModelSize) => `onnx-community/whisper-${size}`

export function configuredTeluguModel(value: string | undefined) {
  const id = value?.trim()
  if (id && /^(?:\/models\/[a-z0-9_-]+|[a-z0-9][a-z0-9_-]*\/[a-z0-9][a-z0-9._-]*)$/i.test(id)) return id
  return undefined
}

export const isSameOriginWhisper = (id: string) => id.startsWith('/models/')
export const whisperWeightBase = (id: string) => isSameOriginWhisper(id) ? `${id}/` : `${WHISPER_MODEL_HOST}${id}/resolve/main/`

export type ModelWeight = { file: string; bytes: number }
export type WasmPaths = { wasm: string; mjs: string }

export type CaptureMessage =
  | { type: 'activity' }
  | { type: 'audio'; samples: Float32Array<ArrayBuffer> }

export type WhisperLanguage = SpeechLanguage | 'auto'

export type WhisperRequest =
  | {
      type: 'load'
      size: ModelSize
      modelId?: string
      language: WhisperLanguage
      preferGpu: boolean
      weights: ModelWeight[]
      wasmPaths: WasmPaths
    }
  | { type: 'audio'; samples: Float32Array<ArrayBuffer> }

export type WhisperResponse =
  | { type: 'progress'; progress: ModelProgress }
  | { type: 'ready'; metrics: SpeechMetrics }
  | { type: 'result'; text: string; metrics: SpeechMetrics }
  | { type: 'error'; phase: 'model' | 'transcription'; backend: SpeechMetrics['backend'] }

export function whisperOptions(language: SpeechLanguage, samples: number) {
  return { language, task: 'transcribe' as const, max_new_tokens: Math.max(64, Math.ceil(samples / AUDIO_SAMPLE_RATE * 13)) }
}
