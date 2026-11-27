import type { SpeechCallbacks, SpeechSource } from './types'

export class MockSpeechSource implements SpeechSource {
  private timer?: ReturnType<typeof setInterval>

  constructor(
    private readonly lines: readonly string[],
    private readonly simulateMicrophone = false,
    private readonly intervalMs = 1800,
  ) {}

  start(callbacks: SpeechCallbacks) {
    this.stop()
    const lines = this.lines[Symbol.iterator]()
    this.timer = setInterval(() => {
      const line = lines.next()
      if (line.done) {
        this.stop()
        return
      }
      callbacks.onActivity()
      callbacks.onFinal(line.value)
    }, this.intervalMs)
    if (this.simulateMicrophone) callbacks.onMicrophone(true)
    callbacks.onReady()
  }

  stop() {
    clearInterval(this.timer)
    this.timer = undefined
  }
}
