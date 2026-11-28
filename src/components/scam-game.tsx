import { Check, UserCircle, X } from '@phosphor-icons/react'
import { useRef, useState } from 'react'
import { getRuleExplanation, type Copy } from '../i18n'
import type { RuleId } from '../detect/rules'
import type { SpeechLanguage } from '../speech/types'
import { Button } from './ui/button'

const rounds: { tactic: number; rule: RuleId }[] = [
  { tactic: 0, rule: 'sensitive-information-request' },
  { tactic: 1, rule: 'official-impersonation' },
  { tactic: 2, rule: 'digital-arrest' },
  { tactic: 3, rule: 'secrecy-demand' },
  { tactic: 4, rule: 'time-pressure' },
  { tactic: 5, rule: 'remote-access-install' },
  { tactic: 6, rule: 'protected-account-transfer' },
  { tactic: 7, rule: 'illegal-parcel-claim' },
  { tactic: 8, rule: 'service-shutoff' },
  { tactic: 9, rule: 'upfront-fee' },
]

export default function ScamGame({ copy, language }: { copy: Copy; language: SpeechLanguage }) {
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState<boolean | null>(null)
  const [points, setPoints] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const safeRound = (chip: number) => ({ text: copy.tryIt.chips[chip]?.[1], rule: null })
  const examples = rounds.map(({ tactic, rule }) => ({ text: copy.landing.tactics[tactic]?.[1], rule }))
  const deck = [examples[0], safeRound(3), ...examples.slice(1, 5), safeRound(4), ...examples.slice(5)]
  const round = deck[index]
  const scam = !!round?.rule
  const c = copy.game
  const format = new Intl.NumberFormat(language)
  const total = format.format(deck.length)
  const progress = c.progress.replace('{step}', format.format(index + 1)).replace('{total}', total)

  return <section className="scam-game" aria-labelledby="game-title">
    <div className="game-intro">
      <h2 id="game-title" ref={heading} tabIndex={-1} data-read>{copy.landing.tricks}</h2>
      <p data-read>{c.prompt}</p>
      {round && <p className="game-progress">{progress}</p>}
    </div>
    <div className="game-round">
      {round ? <>
        <div className="game-message" aria-live="polite">
          <div className="game-turn" key={index}>
            <UserCircle className="game-avatar" aria-hidden="true" />
            <blockquote className="game-bubble">“{round.text}”</blockquote>
          </div>
        </div>
        <div className="game-actions">
          {[true, false].map(guess => <Button key={String(guess)} variant="outline" aria-pressed={answer === guess}
            aria-disabled={answer !== null} onClick={() => {
              if (answer !== null) return
              setAnswer(guess)
              if (guess === scam) setPoints(points + 1)
            }}>{guess ? c.scam : copy.safe}</Button>)}
        </div>
        <div className="game-feedback" role="status">
          {answer !== null && <div data-level={scam ? 'scam-likely' : 'safe'}>
            <strong>{answer === scam ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
              {answer === scam ? c.correct : scam ? c.wasScam : c.wasSafe}</strong>
            <p>{round.rule ? getRuleExplanation(round.rule, language) : c.safeReason}</p>
          </div>}
        </div>
        {answer !== null && <Button onClick={() => {
          setIndex(index + 1)
          setAnswer(null)
          heading.current?.focus({ preventScroll: true })
        }}>{copy.guide.next}</Button>}
      </> : <><p className="game-score">{c.score.replace('{score}', format.format(points)).replace('{total}', total)}</p>
        <p className="game-summary" role="status" data-read>{copy.landing.real}</p>
        <Button onClick={() => { setIndex(0); setPoints(0); heading.current?.focus() }}>{c.again}</Button></>}
    </div>
  </section>
}
