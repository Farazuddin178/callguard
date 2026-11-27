import type { ModelProgress, ModelSize, SpeechLanguage, SpeechMetrics } from './types'

export const AUDIO_SAMPLE_RATE = 16_000
export const AUDIO_CHUNK_SECONDS = 4
export const WHISPER_MODEL_HOST = 'https://huggingface.co/'
export const whisperModelId = (size: ModelSize) => `onnx-community/whisper-${size}`

export type ModelWeight = { file: string; bytes: number }
export type WasmPaths = { wasm: string; mjs: string }

export type CaptureMessage =
  | { type: 'activity' }
  | { type: 'audio'; samples: Float32Array<ArrayBuffer> }

export type WhisperRequest =
  | {
      type: 'load'
      size: ModelSize
      language: SpeechLanguage
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
