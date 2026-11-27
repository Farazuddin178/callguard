import { AUDIO_CHUNK_SECONDS, AUDIO_SAMPLE_RATE, type CaptureMessage } from './whisper-protocol'

declare const sampleRate: number
declare class AudioWorkletProcessor {
  readonly port: MessagePort
}
declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void

class CallAudio extends AudioWorkletProcessor {
  private samples = new Float32Array(AUDIO_SAMPLE_RATE * AUDIO_CHUNK_SECONDS)
  private offset = 0
  private phase = 0
  private sum = 0
  private count = 0
  private energy = 0
  private frameSamples = 0
  private voicedFrames = 0
  private hasSpeech = false

  process(inputs: Float32Array[][]) {
    const input = inputs[0]?.[0]
    if (!input) return true
    for (const sample of input) {
      this.sum += sample
      this.count++
      this.phase += AUDIO_SAMPLE_RATE
      if (this.phase < sampleRate) continue
      this.phase -= sampleRate
      this.push(this.sum / this.count)
      this.sum = 0
      this.count = 0
    }
    return true
  }

  private push(sample: number) {
    this.samples[this.offset++] = sample
    this.energy += sample * sample
    this.frameSamples++

    // Require sustained input across three 40 ms frames before reporting activity.
    if (this.frameSamples === 640) {
      const voiced = this.energy / this.frameSamples >= 0.008 ** 2
      this.voicedFrames = voiced ? this.voicedFrames + 1 : 0
      this.frameSamples = 0
      this.energy = 0
      if (this.voicedFrames === 3 || this.voicedFrames % 25 === 0 && voiced) {
        this.hasSpeech = true
        this.port.postMessage({ type: 'activity' } satisfies CaptureMessage)
      }
      if (this.voicedFrames >= 3) this.hasSpeech = true
    }

    if (this.offset === this.samples.length) {
      if (this.hasSpeech) {
        this.port.postMessage(
          { type: 'audio', samples: this.samples } satisfies CaptureMessage,
          [this.samples.buffer],
        )
        this.samples = new Float32Array(AUDIO_SAMPLE_RATE * AUDIO_CHUNK_SECONDS)
      } else {
        this.samples.fill(0)
      }
      this.offset = 0
      this.hasSpeech = false
    }
  }
}

registerProcessor('call-audio', CallAudio)
