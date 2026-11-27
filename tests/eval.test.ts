import { readFileSync, writeFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
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
type EvaluatedCall = Call & { flagged: boolean; level: ReturnType<typeof scoreTranscript>['level'] }

function metrics(rows: readonly EvaluatedCall[]) {
  const scams = rows.filter(({ label }) => label === 'scam')
  const safe = rows.filter(({ label }) => label === 'safe')
  const scamRed = scams.filter(({ flagged }) => flagged).length
  const safeRed = safe.filter(({ flagged }) => flagged).length
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

function table(header: string, groups: readonly [string, readonly EvaluatedCall[]][]): string[] {
  return [
    '| ' + header + ' | Scam calls | Scam red | Recall | Safe calls | Safe red | FPR |',
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
    ...groups.map(([label, rows]) => {
      const result = metrics(rows)
      return '| ' + [
        label, result.scams, result.scamRed, percent(result.recall),
        result.safe, result.safeRed, percent(result.falsePositiveRate),
      ].join(' | ') + ' |'
    }),
  ]
}

function report(title: string, calls: readonly Call[]) {
  const results = calls.map((call): EvaluatedCall => {
    const { score, level } = scoreTranscript(call.text)
    return { ...call, flagged: score >= SCAM_LIKELY_THRESHOLD, level }
  })
  const careful = results.filter(({ label, level }) => label === 'safe' && level === 'careful')
  const missed = results.filter(({ label, flagged }) => label === 'scam' && !flagged)
  const falseAlarms = results.filter(({ label, flagged }) => label === 'safe' && flagged)
  const ids = (rows: readonly EvaluatedCall[]) => rows.map(({ id }) => id).join(', ') || 'none'

  const output = [
    title, '',
    ...table('Scope', [['Overall', results]]),
    '',
    ...table('Category', categories.map((category) =>
      [category, results.filter((call) => call.categories.includes(category))])),
    '',
    ...table('Language and script', patternLanguages.map((language) =>
      [labels[language], results.filter((call) => script(call) === language)])),
    '',
    'Safe calls in Careful: ' + careful.length,
    '',
    'Misclassified IDs (missed scams): ' + ids(missed),
    '',
    'Misclassified IDs (false alarms): ' + ids(falseAlarms),
  ].join('\n') + '\n'

  process.stdout.write(output + '\n')
  return { output, ...metrics(results) }
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
    const { output, recall, falsePositiveRate } = report('Evaluation set', evaluation)
    if (process.env.CALLGUARD_EVAL_REPORT) {
      writeFileSync(process.env.CALLGUARD_EVAL_REPORT, output)
    }
    expect(recall).toBeGreaterThanOrEqual(0.90)
    expect(falsePositiveRate).toBeLessThanOrEqual(0.10)
  })

  it('reports training set performance for information', () => {
    report('Training set (informational)', training)
  })
})
