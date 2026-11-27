import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { indicComparisonKey, normalizeIndicToken, tolerantIndicWord } from '../src/detect/indic-matching'
import { predictScamProbability } from '../src/detect/model'
import { detectRules } from '../src/detect/rules'
import { scoreTranscript } from '../src/detect/score'

it('normalizes nasal spellings, vowel length and final halant on comparison keys', () => {
  expect(normalizeIndicToken('बन्द')).toBe('बंद')
  expect(normalizeIndicToken('नम्बर')).toBe('नंबर')
  expect(normalizeIndicToken('साँस')).toBe('सांस')
  expect(normalizeIndicToken('सिम्')).toBe('सिम')
  expect(indicComparisonKey('गूंजती')).toBe('गुंजति')
})

it('tolerates one edit in long Indic words without accepting short or cross-script words', () => {
  expect(tolerantIndicWord('बरामद', 'बरामत')).toBe(true)
  expect(tolerantIndicWord('పదార్థ*', 'పదార్ధాలు')).toBe(true)
  expect(tolerantIndicWord('बरामद', 'बरानत')).toBe(false)
  expect(tolerantIndicWord('ड्रग', 'दरग')).toBe(false)
  expect(tolerantIndicWord('बरामद', 'పదార్థ')).toBe(false)
})

it.each([
  ['आज आपका सिम् बन्द कर दिया जाएगा।', 'service-shutoff'],
  ['आपके नाम का पासल रोका है। उसमें दर्स बरामद हुए हैं।', 'illegal-parcel-claim'],
  ['आपके नाम का पैकेट रोका है। उसमें ड्रग्ज़ बरामत हुए।', 'illegal-parcel-claim'],
  ['మీ పేరుతో వచ్చిన పార్సెలులో మత్తు పదార్ధాలు దొరికాయి.', 'illegal-parcel-claim'],
])('scores an actionable variant in %s', (text, id) => {
  expect(scoreTranscript(text).level).toBe('scam-likely')
  expect(detectRules(text).map(hit => hit.id)).toContain(id)
})

it.each([
  'कल से मेरा सिम् बन्द है। दुकान से नया सिम लूँगा।',
  'आपके नाम का पासल है। उसमें दरग बरामद हुए।',
  'आपके नाम का पासल आया। उसमें दर्स मिला।',
  'మీ పార్సెలు గేటు దగ్గర ఉంది. మత్తు పదార్ధాల గురించి వార్తల్లో విన్నాను.',
])('keeps an Indic near miss below red in %s', text => {
  expect(scoreTranscript(text, predictScamProbability(text)).level).not.toBe('scam-likely')
})

it('highlights the original tokens when canonicalization changes their lengths', () => {
  const text = '📞 आज आपका सिम् बन्द कर दिया जाएगा।'
  const service = detectRules(text, true).find(hit => hit.id === 'service-shutoff')
  expect(service?.spans?.map(span => text.slice(span.start, span.end))).toEqual(['सिम्', 'बन्द'])
})

it.each(['test', 'train'])('raises no red alerts for safe scripts in the %s corpus', corpus => {
  const file = readFileSync(new URL(`../data/${corpus}.jsonl`, import.meta.url), 'utf8')
  const rows = file.trim().split(/\r?\n/).map(line => JSON.parse(line)) as {
    id: string; label: 'scam' | 'safe'; text: string
  }[]
  const alarms = rows.filter(row => row.label === 'safe'
    && scoreTranscript(row.text, predictScamProbability(row.text)).level === 'scam-likely')
  expect(alarms.map(row => row.id)).toEqual([])
})
