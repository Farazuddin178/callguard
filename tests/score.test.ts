import { describe, expect, it } from 'vitest'
import { scoreTranscript } from '../src/detect/score'

describe('risk scoring', () => {
  it.each([
    ['Click the link.', 0.2, 29, 'safe'],
    ['Click the link.', 0.25, 30, 'careful'],
    ['We will arrest you.', 0.95, 69, 'careful'],
    ['We will arrest you.', 1, 70, 'scam-likely'],
  ] as const)('classifies %s with model probability %s', (transcript, probability, score, level) => {
    expect(scoreTranscript(transcript, probability)).toMatchObject({ score, level })
  })

  it('caps model input and keeps model-only results below a red alert', () => {
    expect(scoreTranscript('', 2)).toEqual({ score: 20, level: 'safe', rules: [] })
    for (const probability of [-1, Number.NaN, Infinity, -Infinity]) {
      expect(scoreTranscript('', probability)).toEqual({ score: 0, level: 'safe', rules: [] })
    }
  })

  it('clamps the combined score while keeping every distinct hit', () => {
    const transcript = 'Read out the OTP. Read out the OTP. You are under digital arrest.'
    const result = scoreTranscript(transcript)
    expect(result.score).toBe(100)
    expect(result.rules.map(({ id }) => id)).toEqual(['sensitive-information-request', 'digital-arrest'])
    expect(scoreTranscript(transcript)).toEqual(result)
  })

  it('combines weaker signals from an authority claim and a directed legal threat', () => {
    expect(scoreTranscript('I am calling from the Cyber Cell.').level).toBe('careful')
    expect(scoreTranscript('We will arrest you.').level).toBe('careful')
    expect(scoreTranscript('I am calling from the Cyber Cell. We will arrest you.').level)
      .toBe('scam-likely')
  })
})
