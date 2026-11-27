import exportedWeights from './model-weights.json'

const { normalizer, intercept } = exportedWeights
const remove = new RegExp(normalizer.removePattern, 'gu')
const separators = new RegExp(normalizer.separatorPattern, 'gu')
const analyzers = exportedWeights.analyzers.map(({ ngramRange, vocabulary, ...settings }) => ({
  ...settings,
  // The trainer always exports the two bounds of scikit-learn's ngram_range.
  min: ngramRange[0]!,
  max: ngramRange[1]!,
  indices: new Map<string, number | undefined>(Object.entries(vocabulary)),
}))

function normalize(text: string): string {
  const composed = text.normalize(normalizer.unicodeForm)
  const cased = normalizer.lowercase ? composed.toLowerCase() : composed
  return cased.replace(remove, '').replace(separators, ' ').trim()
}

function* ngrams(tokens: string[], { analyzer, min, max }: (typeof analyzers)[number]) {
  if (analyzer === 'word') {
    for (let size = min; size <= max; size++) {
      for (let start = 0; start + size <= tokens.length; start++) {
        yield tokens.slice(start, start + size).join(' ')
      }
    }
    return
  }

  for (const token of tokens) {
    // The normalizer keeps only BMP characters, so Python and JS slice alike.
    const padded = ' ' + token + ' '
    for (let size = min; size <= max; size++) {
      yield padded.slice(0, size)
      for (let start = 1; start + size <= padded.length; start++) {
        yield padded.slice(start, start + size)
      }
      // scikit-learn emits a short padded word once even if it is shorter than n.
      if (size >= padded.length) break
    }
  }
}

export function predictScamProbability(text: string): number {
  const normalized = normalize(text)
  const tokens = normalized ? normalized.split(' ') : []
  let logit = intercept

  for (const analyzer of analyzers) {
    const counts = new Map<number, number>()
    for (const term of ngrams(tokens, analyzer)) {
      const index = analyzer.indices.get(term)
      if (index !== undefined) counts.set(index, (counts.get(index) ?? 0) + 1)
    }

    let sumSquares = 0
    let dot = 0
    for (const [index, count] of counts) {
      const tf = analyzer.sublinearTf ? 1 + Math.log(count) : count
      const tfidf = tf * analyzer.idf[index]!
      sumSquares += tfidf * tfidf
      dot += tfidf * analyzer.coefficients[index]!
    }
    // Each vectorizer normalizes its own feature block before concatenation.
    if (sumSquares > 0) logit += analyzer.norm === 'l2' ? dot / Math.sqrt(sumSquares) : dot
  }

  return 1 / (1 + Math.exp(-logit))
}
