import { describe, expect, it } from 'vitest'
import { predictScamProbability } from '../src/detect/model'
import fixtures from './fixtures/model-parity.json'

describe('browser classifier', () => {
  it('has 30 scikit-learn fixtures balanced by label and language form', () => {
    expect(fixtures).toHaveLength(30)
    for (const form of ['en', 'hi-latn', 'hi-deva', 'te-latn', 'te-telu']) {
      for (const label of ['scam', 'safe']) {
        expect(fixtures.filter(row => row.form === form && row.label === label)).toHaveLength(3)
      }
    }
  })

  it.each(fixtures)('matches scikit-learn for $id within 1e-6', ({ text, probability }) => {
    expect(Math.abs(predictScamProbability(text) - probability)).toBeLessThanOrEqual(1e-6)
  })

  it('normalizes full-width Latin, Indic joiners, punctuation and whitespace', () => {
    expect(predictScamProbability('ＳＥＮＤ 💬  OTP\t! पि\u200dन। ఓటీ\u200cపీ'))
      .toBe(predictScamProbability('send otp पिन ఓటీపీ'))
  })
})
