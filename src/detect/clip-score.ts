import { predictScamProbability } from './model.ts'
import { scoreTranscript } from './score.ts'

export function scoreClip(text: string) {
  return scoreTranscript(text, predictScamProbability(text), true)
}
