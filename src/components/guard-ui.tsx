import { AlertTriangle, Check, ChevronDown, CircleAlert, Mic, MicOff, ShieldCheck } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { RiskResult } from '../detect/score'
import { getRuleExplanation, type Copy } from '../i18n'
import { isLanguage } from '../settings'
import type { ModelProgress, SpeechLanguage } from '../speech/types'

export function LanguagePicker({ copy, language, change }: {
  copy: Copy; language: SpeechLanguage; change: (language: SpeechLanguage) => void
}) {
  return (
    <label className="language-field">
      <span>{copy.language}</span>
      <span className="select-wrap">
        <select value={language} onChange={event => {
          if (isLanguage(event.target.value)) change(event.target.value)
        }}>
          <option value="te" lang="te">{copy.languageNames.te}</option>
          <option value="hi" lang="hi">{copy.languageNames.hi}</option>
          <option value="en" lang="en">{copy.languageNames.en}</option>
        </select>
        <ChevronDown aria-hidden="true" />
      </span>
    </label>
  )
}

export function TopBar({ copy, microphone, demo, test }: {
  copy: Copy; microphone: boolean; demo?: boolean; test?: boolean
}) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <span className="brand"><ShieldCheck aria-hidden="true" />{copy.brand}</span>
        {(demo || test) && <span className="demo-badge">{demo ? copy.demo : copy.testMode}</span>}
        {microphone && <span className="mic-status" role="status">
          <span className="mic-ring"><Mic size={21} aria-hidden="true" /></span>
          {copy.microphoneOn}
        </span>}
        {demo && <span className="demo-mic"><MicOff size={20} aria-hidden="true" />{copy.demoMicOff}</span>}
      </div>
    </header>
  )
}

export function Preparing({ copy, language, progress, awaitingMic }: {
  copy: Copy; language: SpeechLanguage; progress?: ModelProgress; awaitingMic: boolean
}) {
  const size = progress ? new Intl.NumberFormat(language).format(Math.ceil(progress.total / 1_000_000)) : ''
  return (
    <section className="surface preparation" aria-live="polite">
      {progress && !awaitingMic ? <>
        <h2 id="model-progress">{copy.download.replace('{size}', size)}</h2>
        <progress aria-labelledby="model-progress" max={progress.total} value={Math.min(progress.loaded, progress.total)} />
        <p>{copy.downloadHelp}</p>
      </> : <p>{awaitingMic ? copy.allowMic : copy.preparing}</p>}
    </section>
  )
}

const riskIcons = { safe: Check, careful: CircleAlert, 'scam-likely': AlertTriangle }

export function RiskDial({ score }: { score: number }) {
  const style = { '--needle-angle': `${-75 + score * 1.5}deg` } as CSSProperties
  return (
    <div className="gauge" style={style} aria-hidden="true">
      <div className="gauge-arc" />
      <div className="gauge-needle" />
      <div className="gauge-pin" />
    </div>
  )
}

export function RiskGauge({ copy, risk }: { copy: Copy; risk: RiskResult }) {
  const Icon = riskIcons[risk.level]
  return (
    <section className="risk-card surface" data-level={risk.level}>
      <h2>{copy.risk}</h2>
      <RiskDial score={risk.score} />
      <div className="risk-label" role="status"><Icon aria-hidden="true" />{copy[risk.level]}</div>
      {risk.rules.length === 0 && <p>{copy.safeHint}</p>}
    </section>
  )
}

export function Reasons({ copy, risk, language }: { copy: Copy; risk: RiskResult; language: SpeechLanguage }) {
  if (!risk.rules.length) return null
  return (
    <section className="reasons surface">
      <h2>{copy.reasons}</h2>
      <ul>{risk.rules.map(rule => <li key={rule.id}>{getRuleExplanation(rule.id, language)}</li>)}</ul>
    </section>
  )
}
