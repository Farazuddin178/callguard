import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GuardSession } from '../src/session/guard-session'
import type { SpeechCallbacks, SpeechSource } from '../src/speech/types'

class TestSource implements SpeechSource {
  callbacks!: SpeechCallbacks
  stop = vi.fn()

  start(callbacks: SpeechCallbacks) {
    this.callbacks = callbacks
  }

  ready() {
    this.callbacks.onMicrophone(true)
    this.callbacks.onReady()
  }
}

describe('guard session', () => {
  let session: GuardSession
  let source: TestSource

  beforeEach(() => {
    vi.useFakeTimers()
    session = new GuardSession()
    source = new TestSource()
    session.start(source)
  })

  afterEach(() => {
    session.stop()
    vi.useRealTimers()
  })

  it('counts 60 seconds from the last speech activity and clears the session', () => {
    vi.advanceTimersByTime(90_000)
    expect(session.getSnapshot().phase).toBe('preparing')
    source.ready()
    vi.advanceTimersByTime(59_999)
    source.callbacks.onActivity()
    vi.advanceTimersByTime(59_999)
    expect(session.getSnapshot().phase).toBe('listening')
    source.callbacks.onFinal('You are under digital arrest.')
    vi.advanceTimersByTime(1)
    expect(session.getSnapshot()).toMatchObject({ phase: 'idle', microphoneActive: false, timedOut: true })
    expect(session.getTranscript()).toBe('')
    expect(source.stop).toHaveBeenCalledOnce()
  })

  it('stops the source, clears partial and final text and ignores late callbacks', () => {
    source.ready()
    source.callbacks.onFinal('We are calling from your bank.')
    source.callbacks.onPartial('Send me your OTP.')
    expect(session.getTranscript()).toBe('We are calling from your bank. Send me your OTP.')
    session.stop()
    source.callbacks.onFinal('This came back after Stop.')
    source.callbacks.onMicrophone(true)
    source.callbacks.onActivity()
    expect(session.getTranscript()).toBe('')
    expect(session.getSnapshot()).toEqual({
      phase: 'idle', microphoneActive: false, risk: { level: 'safe', score: 0, rules: [] },
    })
    expect(source.stop).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('scores replacements for partial text and escalates as more speech comes in', () => {
    source.ready()
    source.callbacks.onPartial('Hello, this is the police.')
    expect(session.getSnapshot().risk.level).toBe('careful')
    source.callbacks.onPartial('I am calling from the police station.')
    expect(session.getTranscript()).toBe('I am calling from the police station.')
    source.callbacks.onFinal('Hello, this is the police.')
    source.callbacks.onFinal('You are under digital arrest.')
    expect(session.getSnapshot().risk.level).toBe('scam-likely')
    expect(session.getSnapshot().risk.rules.map(rule => rule.id)).toEqual(expect.arrayContaining([
      'official-impersonation', 'digital-arrest',
    ]))
  })

  it('keeps the peak level and the union of rules as text leaves the rolling window', () => {
    source.ready()
    source.callbacks.onFinal('Send me your OTP.')
    expect(session.getSnapshot().risk.level).toBe('scam-likely')
    source.callbacks.onFinal('Hello. '.repeat(500))
    const recent = session.getTranscript()
    expect(recent).not.toContain('OTP')
    expect(recent.length).toBeLessThanOrEqual(2400)
    source.callbacks.onFinal('Hello, this is the police.')
    expect(session.getSnapshot().risk).toMatchObject({ level: 'scam-likely', score: 75 })
    expect(session.getSnapshot().risk.rules.map(rule => rule.id)).toEqual([
      'sensitive-information-request', 'official-impersonation',
    ])

    session.stop()
    session.start(new TestSource())
    expect(session.getSnapshot().risk).toEqual({ level: 'safe', score: 0, rules: [] })
  })
})
