import { expect, it } from 'vitest'
import { detectRules } from '../src/detect/rules'

it.each([
  ['en', '✨ Tell me your ＯＴＰ.', 'ＯＴＰ'],
  ['hi-latn', '✨ Apna UPI PIN mujhe bataiye.', 'UPI PIN'],
  ['hi-deva', '✨ मुझे अपना सीवीवी बता दीजिए।', 'सीवीवी'],
  ['te-latn', '✨ Mee ATM PIN naaku chadavandi.', 'ATM PIN'],
  ['te-telu', '✨ మీ ఓటీపీ నాకు చెప్పండి.', 'ఓటీపీ'],
])('returns original character ranges for %s', (_form, text, cue) => {
  const hit = detectRules(text, true).find(item => item.id === 'sensitive-information-request')
  const start = text.indexOf(cue)
  expect(hit?.spans).toContainEqual({ start, end: start + cue.length })
  expect(hit?.spans?.every(span => span.start > text.indexOf(' ') && span.end <= text.length)).toBe(true)
})

it('does not highlight a safe mention beside the triggering clause', () => {
  const text = 'Never share your OTP. Tell me, please, your card number. Tell me,  “your password”.'
  const hit = detectRules(text, true).find(item => item.id === 'sensitive-information-request')
  expect(hit?.spans?.map(span => text.slice(span.start, span.end))).toEqual(['Tell', 'card number', 'Tell', 'password'])
})
