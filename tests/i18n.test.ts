import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import en from '../src/i18n/en.json'
import hi from '../src/i18n/hi.json'
import te from '../src/i18n/te.json'
import { scoreTranscript } from '../src/detect/score'

function keys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') return [prefix]
  return Object.entries(value).flatMap(([key, entry]) => keys(entry, prefix ? `${prefix}.${key}` : key)).sort()
}

it('ships the same translation keys in all three languages', () => {
  expect(keys(hi)).toEqual(keys(en))
  expect(keys(te)).toEqual(keys(en))
})

it('shows the same English privacy notice in the app and repository', () => {
  const { privacy, privacyListening, privacyLocal, privacyMemory, privacyDownload, privacySettings, privacyFamily } = en.ui
  const notice = readFileSync(new URL('../PRIVACY.md', import.meta.url), 'utf8').replace(/\r\n/g, '\n').trim()
  expect(notice).toBe([`# ${privacy}`, privacyListening, privacyLocal, privacyMemory, privacyDownload,
    privacySettings, privacyFamily].join('\n\n'))
})

it.each([en, hi, te])('escalates each sample script to a digital-arrest alert', ({ ui }) => {
  const risk = scoreTranscript(ui.demoLines.join(' '))
  expect(risk.level).toBe('scam-likely')
  expect(risk.rules.map(rule => rule.id)).toContain('digital-arrest')
})
