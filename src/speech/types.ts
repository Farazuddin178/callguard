export type SpeechLanguage = 'en' | 'hi' | 'te'
export type ModelSize = 'tiny' | 'base' | 'small'
export type SpeechError = 'model' | 'permission' | 'microphone' | 'transcription'

export type ModelProgress = {
  loaded: number
  total: number
}

export type SpeechMetrics = {
  backend: 'webgpu' | 'wasm'
  loadMs: number
  audioSeconds?: number
  transcriptionMs?: number
}

export type SpeechCallbacks = {
  onPartial: (text: string) => void
  onFinal: (text: string) => void
  onActivity: () => void
  onMicrophone: (active: boolean) => void
  onReady: () => void
  onError: (error: SpeechError) => void
  onProgress: (progress: ModelProgress) => void
  onMetrics: (metrics: SpeechMetrics) => void
}

export interface SpeechSource {
  start(callbacks: SpeechCallbacks): void
  stop(): void
}
