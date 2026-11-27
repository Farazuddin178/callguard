import type { RuleId } from '../detect/rules'
import en from './en.json'
import hi from './hi.json'
import te from './te.json'

export const explanationLanguages = ['en', 'hi', 'te'] as const
export type ExplanationLanguage = (typeof explanationLanguages)[number]
export type Copy = typeof en.ui

const translations = { en, hi, te } satisfies Record<
  ExplanationLanguage,
  { ruleExplanations: Record<RuleId, string> }
>

export function getRuleExplanation(id: RuleId, language: ExplanationLanguage): string {
  return translations[language].ruleExplanations[id]
}

export function getCopy(language: ExplanationLanguage): Copy {
  return translations[language].ui
}
