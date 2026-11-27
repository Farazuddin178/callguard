import type { ModelSize, SpeechLanguage } from './speech/types'

export type Settings = {
  language: SpeechLanguage
  modelSize: ModelSize
  familyAlert: boolean
  familyNumber: string
}

const key = 'callguard.settings'
const defaults: Settings = { language: 'en', modelSize: 'base', familyAlert: false, familyNumber: '' }

export function isLanguage(value: unknown): value is SpeechLanguage {
  return value === 'en' || value === 'hi' || value === 'te'
}

export function isModelSize(value: unknown): value is ModelSize {
  return value === 'tiny' || value === 'base' || value === 'small'
}

export function normalizeFamilyNumber(value: string) {
  return value.replace(/[^0-9+]/g, '').replace(/(?!^)\+/g, '').slice(0, 16)
}

export function loadSettings(): Settings {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? 'null')
    if (!value || typeof value !== 'object') return defaults
    return {
      language: 'language' in value && isLanguage(value.language) ? value.language : defaults.language,
      modelSize: 'modelSize' in value && isModelSize(value.modelSize) ? value.modelSize : defaults.modelSize,
      familyAlert: 'familyAlert' in value && value.familyAlert === true,
      familyNumber: 'familyNumber' in value && typeof value.familyNumber === 'string'
        ? normalizeFamilyNumber(value.familyNumber)
        : defaults.familyNumber,
    }
  } catch {
    return defaults
  }
}

export function saveSettings({ language, modelSize, familyAlert, familyNumber }: Settings) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ language, modelSize, familyAlert, familyNumber }))
  } catch {
    // Private browsing can block preferences. The current selection still works.
  }
}
