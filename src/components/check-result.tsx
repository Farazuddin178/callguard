import { ShieldCheck, ShieldWarning as ShieldAlert, WarningCircle as CircleAlert } from '@phosphor-icons/react'
import { useEffect, useId, useRef } from 'react'
import type { RiskResult } from '../detect/score'
import { getRuleExplanation, type Copy } from '../i18n'
import type { SpeechLanguage } from '../speech/types'
import { RiskDial } from './guard-ui'

const verdictIcons = { safe: ShieldCheck, careful: CircleAlert, 'scam-likely': ShieldAlert }

export function CheckResult({ copy, language, text, risk, verdict, variant = 'text' }: {
  copy: Copy; language: SpeechLanguage; text: string; risk: RiskResult; verdict?: string; variant?: 'text' | 'clip'
}) {
  const id = useId()
  const scroller = useRef<HTMLDivElement>(null)
  const followsLatest = useRef(true)
  const clip = variant === 'clip'
  const Icon = verdictIcons[risk.level]
  useEffect(() => {
    const panel = scroller.current
    if (panel && followsLatest.current) panel.scrollTop = panel.scrollHeight
  }, [text])

  const verdictCard = verdict && <section className={clip ? 'surface risk-card' : 'risk-card'} data-level={risk.level}>
    {clip && <span className="clip-verdict-icon"><Icon aria-hidden="true" /></span>}
    <h3>{copy.risk}</h3>
    <RiskDial score={risk.score} />
    <p className="check-verdict" role="status">{verdict} · {risk.score}/100</p>
  </section>
  const words = <HighlightedWords text={text} risk={risk} id={id} />

  return (
    <div className={clip ? 'check-results clip-results' : 'check-results'}>
      {!clip && verdictCard}
      <section className={clip ? 'surface check-words' : 'check-words'}>
        <h3 id={`${id}-words`}>{copy.heard}</h3>
        {clip ? <div ref={scroller} className="clip-transcript" role="region" aria-labelledby={`${id}-words`} tabIndex={0}
          onScroll={event => {
            const panel = event.currentTarget
            followsLatest.current = panel.scrollHeight - panel.clientHeight - panel.scrollTop < 32
          }}>{text ? words : <p>{copy.clip.waitingWords}</p>}</div> : words}
        {risk.rules.length > 0 && <div className="reasons">
          <h3>{copy.reasons}</h3>
          <ul>{risk.rules.map(rule => <li id={`${id}-${rule.id}`} tabIndex={-1} key={rule.id}>{getRuleExplanation(rule.id, language)}</li>)}</ul>
        </div>}
      </section>
      {clip && verdictCard}
    </div>
  )
}

export function HighlightedWords({ text, risk, id }: { text: string; risk: RiskResult; id?: string }) {
  const matches = risk.rules.flatMap(rule => (rule.spans ?? []).map(span => ({ ...span, rule: rule.id })))
  const boundaries = [...new Set([0, text.length, ...matches.flatMap(({ start, end }) => [start, end])])].sort((a, b) => a - b)

  return <p className="highlighted-words">{boundaries.slice(1).map((end, index) => {
    const start = boundaries[index]!
    const words = text.slice(start, end)
    const rules = [...new Set(matches.filter(match => match.start <= start && match.end >= end).map(match => match.rule))]
    if (!rules.length) return <span key={start}>{words}</span>
    if (!id) return <mark key={start}>{words}</mark>
    const target = `${id}-${rules[0]}`
    return <mark key={start}><a href={`#${target}`}
      aria-describedby={rules.map(rule => `${id}-${rule}`).join(' ')}
      onClick={event => {
        event.preventDefault()
        document.getElementById(target)?.focus()
      }}>{words}</a></mark>
  })}</p>
}
