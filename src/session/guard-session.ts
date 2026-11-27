import { scoreTranscript, type RiskResult } from '../detect/score'
import type { ModelProgress, SpeechError, SpeechMetrics, SpeechSource } from '../speech/types'

const SILENCE_MS = 60_000
const WINDOW_CHARS = 2400

type SessionState = {
  phase: 'idle' | 'preparing' | 'listening'
  microphoneActive: boolean
  risk: RiskResult
  timedOut?: boolean
  error?: SpeechError
  progress?: ModelProgress
  metrics?: SpeechMetrics
}

function initialState(): SessionState {
  return { phase: 'idle', microphoneActive: false, risk: scoreTranscript('') }
}

export class GuardSession {
  private state = initialState()
  private readonly listeners = new Set<() => void>()
  private active?: { source: SpeechSource }
  private timer?: ReturnType<typeof setTimeout>
  private finalText = ''
  private partialText = ''

  getSnapshot = () => this.state

  getTranscript = () => `${this.finalText} ${this.partialText}`.trim()

  subscribe = (listener: () => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  start(source: SpeechSource) {
    if (this.active) return
    const active = { source }
    this.active = active
    this.update({ ...initialState(), phase: 'preparing' })
    try {
      source.start({
        onPartial: text => { if (this.active === active) this.receive(text, false) },
        onFinal: text => { if (this.active === active) this.receive(text, true) },
        onActivity: () => { if (this.active === active) this.resetTimer() },
        onMicrophone: microphoneActive => {
          if (this.active === active) this.update({ microphoneActive })
        },
        onReady: () => {
          if (this.active !== active) return
          this.resetTimer()
          this.update({ phase: 'listening', progress: undefined })
        },
        onError: error => { if (this.active === active) this.end({ error }) },
        onProgress: progress => { if (this.active === active) this.update({ progress }) },
        onMetrics: metrics => { if (this.active === active) this.update({ metrics }) },
      })
    } catch {
      if (this.active === active) this.end({ error: 'microphone' })
    }
  }

  stop = () => this.end({})

  private resetTimer() {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => this.end({ timedOut: true }), SILENCE_MS)
  }

  private receive(text: string, final: boolean) {
    if (final) {
      this.finalText = `${this.finalText} ${text.trim()}`.trim().slice(-WINDOW_CHARS)
      this.partialText = ''
    } else {
      this.partialText = text.trim().slice(-WINDOW_CHARS)
    }

    const latest = scoreTranscript(this.getTranscript().slice(-WINDOW_CHARS))
    const previous = this.state.risk
    const rules = new Map(previous.rules.map(rule => [rule.id, rule]))
    for (const rule of latest.rules) rules.set(rule.id, rule)
    const peak = latest.score > previous.score ? latest : previous
    this.update({ risk: { ...peak, rules: Array.from(rules.values()) } })
  }

  private end(outcome: Pick<SessionState, 'error' | 'timedOut'>) {
    const active = this.active
    if (!active) return
    this.active = undefined
    clearTimeout(this.timer)
    this.timer = undefined
    this.finalText = ''
    this.partialText = ''
    try {
      active.source.stop()
    } finally {
      this.state = initialState()
      this.update(outcome)
    }
  }

  private update(patch: Partial<SessionState>) {
    this.state = { ...this.state, ...patch }
    for (const listener of this.listeners) listener()
  }
}
