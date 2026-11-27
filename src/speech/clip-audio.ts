import { AUDIO_SAMPLE_RATE } from './whisper-protocol.ts'

export const CLIP_CHUNK_SAMPLES = 12 * AUDIO_SAMPLE_RATE
export const MAX_CLIP_SECONDS = 300
export const MAX_CLIP_BYTES = 30_000_000

export function mixMono(channels: readonly Float32Array[]): Float32Array<ArrayBuffer> {
  const mono = new Float32Array(channels[0]?.length ?? 0)
  for (const channel of channels) {
    for (let i = 0; i < mono.length; i++) mono[i] = mono[i]! + (channel[i] ?? 0) / channels.length
  }
  return mono
}

export function* clipChunks(samples: Float32Array) {
  for (let start = 0; start < samples.length; start += CLIP_CHUNK_SAMPLES) {
    yield samples.subarray(start, start + CLIP_CHUNK_SAMPLES)
  }
}

export async function decodeVoiceClip(bytes: ArrayBuffer, signal: AbortSignal) {
  try {
    signal.throwIfAborted()
    if (bytes.byteLength > MAX_CLIP_BYTES) throw new Error('Clip too large')
    // Web Audio resamples during decode using the context's sample rate.
    const context = new OfflineAudioContext(1, 1, AUDIO_SAMPLE_RATE)
    const decoded = await context.decodeAudioData(bytes)
    const channels = Array.from({ length: decoded.numberOfChannels }, (_, index) => decoded.getChannelData(index))
    try {
      signal.throwIfAborted()
      if (!decoded.length || decoded.duration > MAX_CLIP_SECONDS) throw new Error('Unsupported clip length')
      return mixMono(channels)
    } finally {
      for (const channel of channels) channel.fill(0)
    }
  } finally {
    // decodeAudioData takes ownership. Wipe bytes still attached on early exits.
    if (bytes.byteLength) new Uint8Array(bytes).fill(0)
  }
}
