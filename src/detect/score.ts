import { detectRules, type RuleHit } from './rules'

export const CAREFUL_THRESHOLD = 30
export const SCAM_LIKELY_THRESHOLD = 70
const MAX_MODEL_POINTS = 20

// A request that alone enables theft (a secret, remote control, a diverted
// payment or an advance fee) can reach red on its own. So can digital arrest
// and a personalised claim that a parcel contains contraband. Other signals
// need corroboration. An authority claim plus a legal threat, or a service
// shutoff plus a payment link or urgency, is enough to reach red. A same-day
// deadline on an impending shutoff supplies urgency, as does pressure to call
// a number right away. Past outages and routine maintenance do not supply
// deadline urgency. Multiple shutoff claims still count as one shutoff rule.

export type RiskLevel = 'safe' | 'careful' | 'scam-likely'

export type RiskResult = {
  score: number
  level: RiskLevel
  rules: RuleHit[]
}

export function scoreTranscript(transcript: string, modelProbability = 0): RiskResult {
  const rules = detectRules(transcript)
  const rulePoints = rules.reduce((total, rule) => total + rule.weight, 0)
  const probability = Number.isFinite(modelProbability)
    ? Math.min(1, Math.max(0, modelProbability))
    : 0
  const score = Math.min(100, rulePoints + Math.round(probability * MAX_MODEL_POINTS))
  const level = score >= SCAM_LIKELY_THRESHOLD ? 'scam-likely'
    : score >= CAREFUL_THRESHOLD ? 'careful'
      : 'safe'

  return { score, level, rules }
}
