import { vocabulary, type Cue } from './vocabulary'

export { patternLanguages, type PatternLanguage } from './vocabulary'

export const categories = [
  'credentials', 'impersonation', 'threats', 'isolation', 'urgency',
  'remote-access', 'money-transfer', 'parcel', 'service-disruption', 'advance-fee',
] as const

export type RuleCategory = (typeof categories)[number]

type Span = { start: number; end: number }
type Clause = {
  cues: ReadonlyMap<Cue, readonly Span[]>
  wordCount: number
}
type Scope = { clause: Clause; previous?: Clause; next?: Clause; earlier?: Clause; afterComma: boolean }
type Pattern = { cue: Cue; words: string[] }

function normalize(text: string): string {
  return text.normalize('NFKC').toLowerCase().replace(/[\u093c\u200c\u200d]/gu, '')
}

function words(text: string): string[] {
  return text.match(/[\p{L}\p{M}\p{N}\p{Pc}]+\*?/gu) ?? []
}

// Index the shared vocabulary once. Each clause can contain cues from any script.
const literal = new Map<string, Pattern[]>()
const inflected = new Map<string, Pattern[]>()
for (const cue of Object.keys(vocabulary) as Cue[]) {
  for (const entry of vocabulary[cue]) {
    const pattern = words(normalize(entry))
    const first = pattern[0]
    if (!first) continue
    const matchingStems = first.endsWith('*')
    const index = matchingStems ? inflected : literal
    const key = matchingStems ? first.charAt(0) : first
    const existing = index.get(key) ?? []
    existing.push({ cue, words: pattern })
    index.set(key, existing)
  }
}

function scan(text: string): Clause {
  // An asterisk in a transcript is punctuation. Stems apply only in the vocabulary.
  const tokens = words(text.replaceAll('*', ' '))
  const cues = new Map<Cue, Span[]>()
  for (const [start, token] of tokens.entries()) {
    const patterns = [...(literal.get(token) ?? []), ...(inflected.get(token.charAt(0)) ?? [])]
    for (const { cue, words } of patterns) {
      if (!words.every((word, offset) => word.endsWith('*')
        ? tokens[start + offset]?.startsWith(word.slice(0, -1))
        : tokens[start + offset] === word)) continue
      const spans = cues.get(cue) ?? []
      spans.push({ start, end: start + words.length })
      cues.set(cue, spans)
    }
  }
  return { cues, wordCount: tokens.length }
}

const defaultGap = 6
const spans = (clause: Clause | undefined, cue: Cue): readonly Span[] => clause?.cues.get(cue) ?? []
const has = (clause: Clause | undefined, cue: Cue) => spans(clause, cue).length > 0
const gap = (a: Span, b: Span) => Math.max(b.start - a.end, a.start - b.end, 0)
const overlaps = (a: Span, b: Span) => a.start < b.end && b.start < a.end
const enclosing = (a: Span, b: Span): Span => ({
  start: Math.min(a.start, b.start),
  end: Math.max(a.end, b.end),
})

function near(clause: Clause, point: Span, cue: Cue, within = defaultGap): boolean {
  return spans(clause, cue).some((other) => gap(point, other) <= within)
}

function pair(
  clause: Clause,
  first: Cue,
  second: Cue,
  within = defaultGap,
  check: (a: Span, b: Span) => boolean = () => true,
): boolean {
  return spans(clause, first).some((a) =>
    spans(clause, second).some((b) => gap(a, b) <= within && check(a, b)),
  )
}

function neighbor({ previous, next }: Scope, cue: Cue): boolean {
  return has(previous, cue) || has(next, cue)
}

function negated(clause: Clause, action: Span, subject = action): boolean {
  const evidence = enclosing(action, subject)
  return spans(clause, 'negation').some((no) =>
    // Allows forms such as "never directly share", "click mat karna" and "fee nahi hai".
    (no.end <= action.start && action.start - no.end <= 2
      && (no.end > evidence.start || evidence.start - no.end <= 3))
    || (no.start >= action.end && no.start - action.end <= 1)
    || (no.start >= evidence.end && no.start - evidence.end <= 1)
    || (no.start < action.end && no.end > action.start),
  )
}

function attributedDirectives(clause: Clause, before = clause.wordCount): Span[] {
  const speakers = [...spans(clause, 'thirdPerson'), ...spans(clause, 'scamActor')]
  return spans(clause, 'directiveReport').filter((frame) =>
    speakers.some((speaker) =>
      speaker.start < before && speaker.start <= frame.start && gap(speaker, frame) <= 16),
  )
}

function reported({ clause, previous, next, afterComma }: Scope, evidence: Span): boolean {
  // A warning conditional needs a protective response. Mere mentions of scams or
  // scammers carry no suppression. A reported quote stays inside its own clause.
  const protective = (part: Clause) =>
    spans(part, 'advice').some((point) => !negated(part, point))
  if (has(clause, 'conditionalReport') && (protective(clause) || (next && protective(next)))) {
    const frames = spans(clause, 'conditionalReport')
    if (frames.some((frame) => frame.start <= evidence.start || gap(frame, evidence) <= defaultGap)) {
      return true
    }
  }
  if (spans(clause, 'reported').some((frame) => frame.start <= evidence.start)) return true
  // Reporting verbs usually introduce the quote in English and can follow it
  // in Hindi and Telugu. A warning notice can supply an omitted subject.
  const directives = has(clause, 'warningNotice') || has(previous, 'warningNotice')
    ? spans(clause, 'directiveReport')
    : attributedDirectives(clause, evidence.start)
  if (directives.some((frame) => frame.end <= evidence.start
    || (frame.start >= evidence.start && gap(frame, evidence) <= 5))) return true
  if (afterComma && previous && attributedDirectives(previous).some((frame) =>
    frame.end === previous.wordCount,
  )) return true
  if (spans(clause, 'news').some((frame) => frame.start <= evidence.end)
    || (has(clause, 'news') && has(clause, 'attribution'))) return true
  if (pair(clause, 'topic', 'explanationFrame', 4, (_, frame) => frame.end <= evidence.end)) return true
  return pair(clause, 'thirdPerson', 'attribution', 18, (actor, quote) =>
    actor.start <= evidence.start && (quote.start <= evidence.start || gap(quote, evidence) <= 5),
  )
}

function direct(scope: Scope, action: Span, object: Span): boolean {
  return !negated(scope.clause, action, object) && !reported(scope, enclosing(action, object))
}

function instruction(scope: Scope, action: Span, object: Span): boolean {
  // "We install it" and "tell us to install it" are different speech acts.
  // A first-person request such as "I need your PIN" uses its own request cue.
  return direct(scope, action, object) && !spans(scope.clause, 'nonListener')
    .some((actor) => actor.end === action.start)
}

function requestCredential(scope: Scope): boolean {
  const { clause } = scope
  const requested = (action: Span, object: Span) => {
    if (!instruction(scope, action, object)) return false
    if (near(clause, object, 'homeNetwork', 2)) return false
    // A doorstep handoff is a different recipient. A request to tell the caller
    // still counts, even when the caller uses a delivery story as a pretext.
    if (near(clause, action, 'toCaller', 3)) return true
    const request = enclosing(action, object)
    const doorstepHandoff = near(clause, object, 'deliveryProof', 2)
      && near(clause, request, 'recipientMarker', 4)
      && near(clause, request, 'inPerson', 8)
    return !doorstepHandoff && !near(clause, request, 'deliveryRecipient', 5)
  }
  return pair(clause, 'request', 'credential', 9, requested)
    || pair(clause, 'request', 'code', 9, (action, object) =>
      near(clause, object, 'codeContext', 4) && requested(action, object),
    )
}

function claimAuthority(scope: Scope): boolean {
  const { clause } = scope
  return pair(clause, 'claim', 'agency', 7, (action, agency) => direct(scope, action, agency))
    || pair(clause, 'authoritySource', 'agency', 4, (source, agency) =>
      near(clause, enclosing(source, agency), 'speaking', 4) && direct(scope, source, agency),
    )
    || pair(clause, 'role', 'agency', 4, (role, agency) =>
      !has(clause, 'employment') && direct(scope, role, agency)
      && (near(clause, enclosing(role, agency), 'speaker', 5)
        || near(clause, enclosing(role, agency), 'authoritySource', 2)),
    )
}

function threaten(scope: Scope): boolean {
  const { clause } = scope
  if (has(clause, 'lossReport')) return false
  const separateThreat = (action: Span, object: Span) =>
    !spans(clause, 'digitalArrest').some((point) => overlaps(point, action) || overlaps(point, object))
    && direct(scope, action, object)
  return pair(clause, 'legalAction', 'case', 5, (action, object) =>
    near(clause, enclosing(action, object), 'target', 8) && separateThreat(action, object),
  ) || pair(clause, 'legalAction', 'target', 4, (action, target) =>
    // A bare threat to arrest or take someone into custody has no separate case noun.
    near(clause, action, 'case', 0) && separateThreat(action, target),
  )
}

function controlVideo(scope: Scope): boolean {
  const { clause } = scope
  return spans(clause, 'noDisconnect').some((point) => !reported(scope, point))
    || pair(clause, 'disconnect', 'call', 5, (action, call) =>
      negated(clause, action, call) && !reported(scope, enclosing(action, call)),
    )
    || pair(clause, 'stay', 'video', 5, (action, video) =>
      (near(clause, enclosing(action, video), 'control') || neighbor(scope, 'claim'))
      && direct(scope, action, video),
    )
    || pair(clause, 'video', 'control', 4, (video, control) =>
      direct(scope, control, video),
    )
}

function demandSecrecy(scope: Scope): boolean {
  const { clause } = scope
  if (has(clause, 'surprise') || has(scope.next, 'surprise')) return false
  return spans(clause, 'secrecy').some((point) =>
    !near(clause, point, 'credential', 4) && !reported(scope, point),
  ) || pair(clause, 'disclosure', 'family', 7, (action, family) =>
    negated(clause, action, family) && !near(clause, action, 'credential', 5)
    && !reported(scope, enclosing(action, family)),
  )
}

function pushTransfer(scope: Scope): boolean {
  const { clause } = scope
  return pair(clause, 'transfer', 'account', 8, (action, account) => {
    if (!instruction(scope, action, account)
      || spans(clause, 'depositNoun').some((noun) => overlaps(action, noun))) return false

    return spans(clause, 'protected').some((protection) => {
      if (gap(account, protection) > 2) return false
      const accountPhrase = enclosing(account, protection)
      const from = spans(clause, 'sourceBefore').some((marker) =>
        marker.end <= accountPhrase.start && gap(marker, accountPhrase) <= 2,
      ) || spans(clause, 'sourceAfter').some((marker) => marker.start === accountPhrase.end)
      return !from
    })
  })
}

function claimParcel(scope: Scope): boolean {
  const { clause, previous, next } = scope
  const targeted = pair(clause, 'parcel', 'owner', 7, (parcel, owner) =>
    !reported(scope, enclosing(parcel, owner)),
  ) || pair(clause, 'parcel', 'possessive', 2, (parcel, owner) =>
    owner.end <= parcel.start && !near(clause, owner, 'identifier', 1)
    && !reported(scope, enclosing(parcel, owner)),
  ) || pair(clause, 'parcel', 'identifierLink', 9, (parcel, link) =>
    spans(clause, 'identifier').some((identifier) =>
      gap(identifier, link) <= 7 && near(clause, identifier, 'possessive', 1)
      && direct(scope, link, enclosing(parcel, identifier)),
    ),
  )
  if (!targeted) return false
  return [clause, previous, next].some((nearby) => nearby && pair(nearby, 'find', 'contraband', 5,
    (find, item) => direct(nearby === clause ? scope : { clause: nearby, afterComma: false }, find, item),
  ))
}

function demandFee(scope: Scope): boolean {
  const { clause, earlier, previous } = scope
  const claimFollowsBenefit = has(previous, 'collect') && has(earlier, 'benefit')
  if (!has(clause, 'benefit') && !neighbor(scope, 'benefit') && !claimFollowsBenefit) return false
  return pair(clause, 'pay', 'fee', 6, (action, fee) => direct(scope, action, fee))
    || pair(clause, 'pay', 'collect', 6, (action, purpose) => direct(scope, action, purpose))
}

function serviceShutoff(scope: Scope, check: (action: Span, service: Span) => boolean = () => true): boolean {
  return pair(scope.clause, 'shutoff', 'service', 8, (action, service) =>
    check(action, service) && direct(scope, action, service),
  )
}

function applyPressure(scope: Scope): boolean {
  const { clause } = scope
  return pair(clause, 'consequential', 'pressure', 6, (action, time) => direct(scope, action, time))
    || pair(clause, 'callback', 'callbackNumber', 4, (action, number) =>
      near(clause, enclosing(action, number), 'pressure', 5) && instruction(scope, action, number),
    )
    || (!has(clause, 'maintenance') && serviceShutoff(scope, (action, service) =>
      near(clause, enclosing(action, service), 'sameDay', 4)
      && !spans(clause, 'pastShutoff').some((past) => overlaps(action, past)),
    ))
}

type RuleDefinition = {
  id: string
  category: RuleCategory
  weight: number
  matches: (scope: Scope) => boolean
}

export const rules = [
  { id: 'sensitive-information-request', category: 'credentials', weight: 75, matches: requestCredential },
  { id: 'official-impersonation', category: 'impersonation', weight: 30, matches: claimAuthority },
  {
    id: 'digital-arrest', category: 'threats', weight: 75,
    matches: (scope) => pair(scope.clause, 'digitalArrest', 'target', 7, (action, target) =>
      direct(scope, action, target)),
  },
  { id: 'legal-threat', category: 'threats', weight: 50, matches: threaten },
  { id: 'video-call-control', category: 'isolation', weight: 40, matches: controlVideo },
  { id: 'secrecy-demand', category: 'isolation', weight: 40, matches: demandSecrecy },
  { id: 'time-pressure', category: 'urgency', weight: 25, matches: applyPressure },
  {
    id: 'remote-access-install', category: 'remote-access', weight: 75,
    matches: (scope) => pair(scope.clause, 'install', 'software', 7, (action, app) => instruction(scope, action, app))
      || (has(scope.previous, 'software') && pair(scope.clause, 'install', 'appReference', 3, (action, app) =>
        instruction(scope, action, app)))
      || pair(scope.clause, 'request', 'id', 8, (action, id) =>
        near(scope.clause, id, 'screen', 5) && direct(scope, action, id)),
  },
  {
    id: 'link-request', category: 'remote-access', weight: 25,
    matches: (scope) => pair(scope.clause, 'activate', 'link', 6, (action, link) => instruction(scope, action, link)),
  },
  { id: 'protected-account-transfer', category: 'money-transfer', weight: 75, matches: pushTransfer },
  { id: 'illegal-parcel-claim', category: 'parcel', weight: 75, matches: claimParcel },
  { id: 'service-shutoff', category: 'service-disruption', weight: 45, matches: serviceShutoff },
  { id: 'upfront-fee', category: 'advance-fee', weight: 75, matches: demandFee },
] as const satisfies readonly RuleDefinition[]

export type RuleId = (typeof rules)[number]['id']
export type RuleHit = { id: RuleId; category: RuleCategory; weight: number }

export function detectRules(transcript: string): RuleHit[] {
  const clauses = normalize(transcript)
    .replace(/,\s*(please|sir|कृपया|దయచేసి)\s*,/gu, ' $1 ')
    .replace(/,\s*(?=["“‘])/gu, ' ')
    .split(/([.!?;,।॥\r\n]+|(?<![\p{L}\p{M}\p{N}\p{Pc}])(?:but|however|so|and now|instead|lekin|magar|isliye|लेकिन|मगर|इसलिए|కానీ|కాబట్టి|kaani|kabatti|kaabatti)(?![\p{L}\p{M}\p{N}\p{Pc}]))/gu)
    .flatMap((part, index, parts) => index % 2 === 0 && part.trim()
      ? [{ clause: scan(part), afterComma: parts[index - 1] === ',' }]
      : [])
  const scopes = clauses.map((part, index): Scope => ({
    ...part, previous: clauses[index - 1]?.clause, next: clauses[index + 1]?.clause,
    earlier: clauses[index - 2]?.clause,
  }))
  const hits: RuleHit[] = []
  for (const { id, category, weight, matches } of rules) {
    if (scopes.some((scope) => matches(scope))) hits.push({ id, category, weight })
  }
  return hits
}
