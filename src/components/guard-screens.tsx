import { ChatCircle as MessageCircle, Phone, Square, Warning as AlertTriangle } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { Copy } from '../i18n'
import type { GuardSession } from '../session/guard-session'
import type { Settings } from '../settings'
import { Preparing, Reasons, RiskDial, RiskGauge } from './guard-ui'
import { Button } from './ui/button'

type ScreenProps = {
  copy: Copy
  settings: Settings
  state: ReturnType<GuardSession['getSnapshot']>
  stop: () => void
}

export function Listening({ copy, settings, state, stop }: ScreenProps) {
  return (
    <main className="screen listening-screen">
      <h1 id="screen-title" tabIndex={-1}>{state.phase === 'preparing' ? copy.preparing : copy.listening}</h1>
      {state.phase === 'preparing'
        ? (state.progress || state.metrics) && <Preparing
          copy={copy} language={settings.language} progress={state.progress} awaitingMic={!!state.metrics}
        />
        : <>
            <RiskGauge copy={copy} risk={state.risk} />
            <Reasons copy={copy} risk={state.risk} language={settings.language} />
          </>}
      <div className="bottom-action">
        <Button className="w-full" onClick={stop}><Square aria-hidden="true" size={21} />{copy.stop}</Button>
      </div>
    </main>
  )
}

export function AlertIntro({ copy, Heading = 'h1', compact, headingRef }: {
  copy: Copy; Heading?: 'h1' | 'h3'; compact?: boolean; headingRef?: React.Ref<HTMLHeadingElement>
}) {
  return <div className="alert-intro">
    <p className="alert-label"><AlertTriangle aria-hidden="true" />{copy['scam-likely']}</p>
    <Heading ref={headingRef} id={compact ? undefined : 'screen-title'} tabIndex={!compact || headingRef ? -1 : undefined}>{copy.hangUp}</Heading>
    {!compact && <p>{copy.alertHelp}</p>}
  </div>
}

export function AlertActions({ copy, stop, demo, familyLink, hangUpLabel, hint }: {
  copy: Copy; stop: () => void; demo?: boolean; familyLink?: string; hangUpLabel?: string; hint?: ReactNode
}) {
  const helpline = <><Phone aria-hidden="true" />{copy.helpline}</>
  const family = <><MessageCircle aria-hidden="true" />{copy.familySend}</>
  return <div className="alert-actions">
    {demo
      ? <Button variant="light" disabled>{helpline}</Button>
      : <Button asChild variant="light"><a href="tel:1930">{helpline}</a></Button>}
    <Button className={hint ? 'tap-target' : undefined} variant="outline" onClick={stop}>{hangUpLabel ?? copy.hungUp}{hint}</Button>
    {familyLink && <Button asChild variant="outline">
      <a href={familyLink} target="_blank" rel="noreferrer noopener">{family}</a>
    </Button>}
  </div>
}

export function RedAlert({ copy, settings, state, stop }: ScreenProps) {
  const number = settings.familyNumber.replace(/\D/g, '')
  const familyLink = `https://wa.me/${number}?text=${encodeURIComponent(copy.familyMessage)}`
  return (
    <main className="screen red-screen">
      <AlertIntro copy={copy} />
      <AlertActions copy={copy} stop={stop} familyLink={settings.familyAlert ? familyLink : undefined} />
      <Reasons copy={copy} risk={state.risk} language={settings.language} />
      <RiskDial score={state.risk.score} />
    </main>
  )
}
