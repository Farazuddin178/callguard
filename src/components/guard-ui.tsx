import { BookOpen, CaretDown as ChevronDown, Check, Microphone as Mic, ShieldCheck, Warning as AlertTriangle, WarningCircle as CircleAlert } from '@phosphor-icons/react'
import type { CSSProperties, ReactNode } from 'react'
import type { RiskResult } from '../detect/score'
import { getRuleExplanation, type Copy } from '../i18n'
import { isLanguage } from '../settings'
import type { ModelProgress, SpeechLanguage } from '../speech/types'

export function LanguagePicker({ copy, language, change, compact = false }: {
  copy: Copy; language: SpeechLanguage; change: (language: SpeechLanguage) => void; compact?: boolean
}) {
  return (
    <label className="language-field">
      <span className={compact ? 'sr-only' : undefined}>{copy.language}</span>
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

export function TopBar({ copy, microphone, navigation, guidePage, test, tools }: {
  copy: Copy; microphone: boolean; navigation?: boolean; guidePage?: boolean; test?: boolean; tools?: ReactNode
}) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        {navigation ? <a className="brand" href="#/"><ShieldCheck aria-hidden="true" />{copy.brand}</a>
          : <span className="brand"><ShieldCheck aria-hidden="true" />{copy.brand}</span>}
        {navigation && <nav className="topbar-nav">
          <a href="#/guide" aria-current={guidePage ? 'page' : undefined}><BookOpen aria-hidden="true" />{copy.guide.title}</a>
        </nav>}
        {tools && <div className="topbar-actions">{tools}</div>}
        {test && <span className="demo-badge">{copy.testMode}</span>}
        {microphone && <span className="mic-status" role="status">
          <span className="mic-ring"><Mic size={21} aria-hidden="true" /></span>
          {copy.microphoneOn}
        </span>}
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

export function RiskGauge({ copy, risk, compact, verdict, statusHint }: {
  copy: Copy; risk: RiskResult; compact?: boolean; verdict?: string; statusHint?: ReactNode
}) {
  const Icon = riskIcons[risk.level]
  return (
    <section className="risk-card surface" data-level={risk.level}>
      <h2>{copy.risk}</h2>
      <RiskDial score={risk.score} />
      <div className="risk-label" role="status"><Icon aria-hidden="true" />{verdict ?? copy[risk.level]}{statusHint}</div>
      {!compact && risk.rules.length === 0 && <p>{copy.safeHint}</p>}
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
