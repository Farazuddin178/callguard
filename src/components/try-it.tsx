import { useState } from 'react'
import { scoreTranscript } from '../detect/score'
import type { Copy } from '../i18n'
import type { SpeechLanguage } from '../speech/types'
import { CheckResult } from './check-result'
import { Button } from './ui/button'

export function TryIt({ copy, language }: { copy: Copy; language: SpeechLanguage }) {
  const [text, setText] = useState('')
  const c = copy.tryIt
  const risk = scoreTranscript(text, 0, true)
  const verdict = risk.level === 'safe' ? c.normal : risk.level === 'careful' ? copy.careful : c.scam
  return (
    <section className="text-checker surface" aria-labelledby="try-title">
      <h2 id="try-title" data-read>{c.title}</h2>
      <div className="try-input">
        <label htmlFor="caller-words" data-read>{c.prompt}</label>
        <textarea id="caller-words" value={text} maxLength={5000} rows={3} spellCheck={false} autoComplete="off" autoCorrect="off" onChange={event => setText(event.target.value)} />
        <p data-read>{c.examples}</p>
        <div className="example-chips">{c.chips.map(([title, words]) =>
          <Button key={title} variant="outline" aria-pressed={text === words} onClick={() => setText(words ?? '')}>{title}</Button>
        )}</div>
      </div>
      {text.trim() ? <CheckResult copy={copy} language={language} text={text} risk={risk} verdict={verdict} />
        : <p className="checker-idle" data-read>{c.empty}</p>}
    </section>
  )
}
