const devanagari = /^[\u0900-\u097f]+$/u
const telugu = /^[\u0c00-\u0c7f]+$/u
const nasalClusters = /ङ्(?=[क-घ])|ञ्(?=[च-झ])|ण्(?=[ट-ढ])|न्(?=[त-ध])|म्(?=[प-भ])/gu
const hindiVowelLengths: Record<string, string> = { 'ई': 'इ', 'ऊ': 'उ', 'ी': 'ि', 'ू': 'ु' }

export function normalizeIndicToken(word: string): string {
  return word.replace(nasalClusters, 'ं').replaceAll('ँ', 'ं').replace(/्(?=\*?$)/u, '')
}

export function indicComparisonKey(word: string): string | undefined {
  if (word.length < 5) return undefined
  if (devanagari.test(word)) return word.replace(/[ईऊ]|ी|ू/gu, letter => hindiVowelLengths[letter]!)
  if (telugu.test(word)) return word
  return undefined
}

/** A substitution, insertion or deletion. The caller checks script and minimum length. */
export function withinOneEdit(first: string, second: string): boolean {
  if (Math.abs(first.length - second.length) > 1) return false
  const [short, long] = first.length <= second.length ? [first, second] : [second, first]
  let index = 0
  while (index < short.length && short[index] === long[index]) index++
  return short.slice(index + Number(short.length === long.length)) === long.slice(index + 1)
}

export function tolerantIndicWord(pattern: string, token: string): boolean {
  const stem = pattern.endsWith('*')
  const root = stem ? pattern.slice(0, -1) : pattern
  const expected = indicComparisonKey(root)
  const actual = indicComparisonKey(token)
  if (!expected || !actual || devanagari.test(root) !== devanagari.test(token)) return false
  if (!stem) return withinOneEdit(expected, actual)
  return [-1, 0, 1].some(extra => {
    const length = expected.length + extra
    return length >= 5 && actual.length >= length && withinOneEdit(expected, actual.slice(0, length))
  })
}
