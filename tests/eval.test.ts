import { readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { predictScamProbability } from '../src/detect/model'
import { categories, patternLanguages, type PatternLanguage, type RuleCategory } from '../src/detect/rules'
import { SCAM_LIKELY_THRESHOLD, scoreTranscript } from '../src/detect/score'

type Call = {
  id: string
  lang: 'en' | 'hi' | 'te'
  text: string
  label: 'scam' | 'safe'
  categories: RuleCategory[]
  source: string
}

function isCall(value: unknown): value is Call {
  if (typeof value !== 'object' || value === null) return false
  const row = value as Record<string, unknown>
  return Object.keys(row).length === 6
    && typeof row.id === 'string' && /^[a-z0-9-]+$/u.test(row.id)
    && (row.lang === 'en' || row.lang === 'hi' || row.lang === 'te')
    && typeof row.text === 'string' && row.text.trim().length > 0
    && (row.label === 'scam' || row.label === 'safe')
    && Array.isArray(row.categories) && row.categories.length > 0
    && row.categories.every((category: unknown) =>
      categories.some((known) => known === category))
    && row.source === (row.label === 'scam' ? 'synthetic-from-public-reports' : 'synthetic-safe')
}

function loadCalls(file: 'test' | 'train'): Call[] {
  const lines = readFileSync(new URL('../data/' + file + '.jsonl', import.meta.url), 'utf8')
    .trimEnd().split(/\r?\n/u)

  return lines.map((line, index) => {
    const row: unknown = JSON.parse(line)
    if (!isCall(row)) throw new Error('Invalid ' + file + '.jsonl row at line ' + (index + 1))
    return row
  })
}

function script({ lang, text }: Call): PatternLanguage {
  if (lang === 'hi') return /\p{Script=Devanagari}/u.test(text) ? 'hi-deva' : 'hi-latn'
  if (lang === 'te') return /\p{Script=Telugu}/u.test(text) ? 'te-telu' : 'te-latn'
  return 'en'
}

const labels: Record<PatternLanguage, string> = {
  en: 'English',
  'hi-latn': 'Hindi (romanised)',
  'hi-deva': 'Hindi (Devanagari)',
  'te-latn': 'Telugu (romanised)',
  'te-telu': 'Telugu (Telugu script)',
}

const evaluation = loadCalls('test')
const training = loadCalls('train')
type ScoreMode = 'rulesOnly' | 'combined'
type EvaluatedCall = Call & Record<ScoreMode, ReturnType<typeof scoreTranscript>>
type Group = [string, readonly EvaluatedCall[]]

function metrics(rows: readonly EvaluatedCall[], mode: ScoreMode) {
  const scams = rows.filter(({ label }) => label === 'scam')
  const safe = rows.filter(({ label }) => label === 'safe')
  const scamRed = scams.filter(row => row[mode].score >= SCAM_LIKELY_THRESHOLD).length
  const safeRed = safe.filter(row => row[mode].score >= SCAM_LIKELY_THRESHOLD).length
  return {
    scams: scams.length,
    safe: safe.length,
    scamRed,
    safeRed,
    recall: scamRed / scams.length,
    falsePositiveRate: safeRed / safe.length,
  }
}

const percent = (rate: number) => Number.isNaN(rate) ? 'n/a' : (rate * 100).toFixed(1) + '%'

function table(header: string, groups: readonly Group[]): string[] {
  return [
    '| ' + header + ' | Scam calls | Scam red | Recall | Safe calls | Safe red | FPR |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...groups.map(([label, rows]) => {
      const result = metrics(rows, 'combined')
      return '| ' + [
        label, result.scams, result.scamRed, percent(result.recall),
        result.safe, result.safeRed, percent(result.falsePositiveRate),
      ].join(' | ') + ' |'
    }),
  ]
}

function comparison(groups: readonly Group[]): string[] {
  return [
    '| Language and script | Rules only recall | Rules only FPR | Rules plus model recall | Rules plus model FPR |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...groups.map(([label, rows]) => {
      const rules = metrics(rows, 'rulesOnly')
      const combined = metrics(rows, 'combined')
      return '| ' + [
        label,
        percent(rules.recall) + ' (' + rules.scamRed + '/' + rules.scams + ')',
        percent(rules.falsePositiveRate) + ' (' + rules.safeRed + '/' + rules.safe + ')',
        percent(combined.recall) + ' (' + combined.scamRed + '/' + combined.scams + ')',
        percent(combined.falsePositiveRate) + ' (' + combined.safeRed + '/' + combined.safe + ')',
      ].join(' | ') + ' |'
    }),
  ]
}

function report(title: string, calls: readonly Call[]) {
  const results = calls.map((call): EvaluatedCall => ({
    ...call,
    rulesOnly: scoreTranscript(call.text),
    combined: scoreTranscript(call.text, predictScamProbability(call.text)),
  }))
  const red = results.filter(({ combined }) => combined.score >= SCAM_LIKELY_THRESHOLD)
  const careful = results.filter(({ label, combined }) => label === 'safe' && combined.level === 'careful')
  const missed = results.filter(({ label, combined }) => label === 'scam' && combined.score < SCAM_LIKELY_THRESHOLD)
  const falseAlarms = red.filter(({ label }) => label === 'safe')
  const ids = (rows: readonly EvaluatedCall[]) => rows.map(({ id }) => id).join(', ') || 'none'

  const output = [
    title, '',
    ...comparison([
      ['Overall', results],
      ...patternLanguages.map((language): Group =>
        [labels[language], results.filter((call) => script(call) === language)]),
    ]),
    '',
    'Rules plus model by category', '',
    ...table('Category', categories.map((category) =>
      [category, results.filter((call) => call.categories.includes(category))])),
    '',
    'Safe calls in Careful (rules plus model): ' + careful.length,
    '',
    'Misclassified IDs (missed scams): ' + ids(missed),
    '',
    'Misclassified IDs (false alarms): ' + ids(falseAlarms),
  ].join('\n') + '\n'

  process.stdout.write(output + '\n')
  return { output, red, ...metrics(results, 'combined') }
}

const expectedPerLabel: Record<PatternLanguage, number> = {
  en: 20, 'hi-latn': 20, 'hi-deva': 10, 'te-latn': 7, 'te-telu': 8,
}

describe('scam detection evaluation', () => {
  it('keeps 130 evaluation calls distinct from the training calls', () => {
    expect(evaluation).toHaveLength(130)
    expect(training.length).toBeGreaterThanOrEqual(150)
    const all = [...evaluation, ...training]
    expect(new Set(all.map(({ id }) => id)).size).toBe(all.length)
    const texts = new Set(evaluation.map(({ text }) => text.normalize('NFKC').toLowerCase()))
    expect(training.some(({ text }) => texts.has(text.normalize('NFKC').toLowerCase()))).toBe(false)
    for (const language of patternLanguages) {
      for (const label of ['scam', 'safe']) {
        const inGroup = (call: Call) => script(call) === language && call.label === label
        expect(evaluation.filter(inGroup)).toHaveLength(expectedPerLabel[language])
        expect(training.some(inGroup)).toBe(true)
      }
    }
  })

  it('meets the 90% recall and 10% false-positive limits for red alerts', () => {
    const { output, red, recall, falsePositiveRate } = report('Evaluation set', evaluation)
    if (process.env.CALLGUARD_EVAL_REPORT) {
      writeFileSync(process.env.CALLGUARD_EVAL_REPORT, output)
    }
    expect(recall).toBeGreaterThanOrEqual(0.90)
    expect(falsePositiveRate).toBeLessThanOrEqual(0.10)
    expect(red.every(({ combined }) => combined.rules.length > 0)).toBe(true)
  })

  it('reports training set performance for information', () => {
    report('Training set (informational)', training)
  })
})
