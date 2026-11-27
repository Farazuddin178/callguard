import { AlertTriangle, MessageCircle, Phone, Square } from 'lucide-react'
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

export function RedAlert({ copy, settings, state, stop, demo }: ScreenProps & { demo: boolean }) {
  const number = settings.familyNumber.replace(/\D/g, '')
  const familyLink = `https://wa.me/${number}?text=${encodeURIComponent(copy.familyMessage)}`
  const helpline = <><Phone aria-hidden="true" />{copy.helpline}</>
  const family = <><MessageCircle aria-hidden="true" />{copy.familySend}</>
  return (
    <main className="screen red-screen">
      <div className="alert-intro">
        <p className="alert-label"><AlertTriangle aria-hidden="true" />{copy['scam-likely']}</p>
        <h1 id="screen-title" tabIndex={-1}>{copy.hangUp}</h1>
        <p>{copy.alertHelp}</p>
      </div>
      <div className="alert-actions">
        {demo
          ? <Button variant="light" disabled>{helpline}</Button>
          : <Button asChild variant="light"><a href="tel:1930">{helpline}</a></Button>}
        <Button variant="outline" onClick={stop}>{copy.hungUp}</Button>
        {settings.familyAlert && (demo
          ? <Button variant="outline" disabled>{family}</Button>
          : <Button asChild variant="outline">
              <a href={familyLink} target="_blank" rel="noreferrer noopener">{family}</a>
            </Button>)}
      </div>
      <Reasons copy={copy} risk={state.risk} language={settings.language} />
      <RiskDial score={state.risk.score} />
    </main>
  )
}
