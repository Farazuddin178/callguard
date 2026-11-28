import { predictScamProbability } from '../detect/model'
import { scoreTranscript } from '../detect/score'
import type { Copy } from '../i18n'

export function practiceLines(copy: Copy, scenario: 'scam' | 'bank') {
  if (scenario === 'scam') return copy.demoLines
  const bank = copy.tryIt.chips[3]?.[1] ?? ''
  return bank.match(/[^.।]+[.।]?/gu)?.map(line => line.trim()).filter(Boolean) ?? []
}

export function scorePractice(text: string) {
  return scoreTranscript(text, text ? predictScamProbability(text) : 0, true)
}
