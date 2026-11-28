import { HandPointing, Microphone, PhoneCall, PhoneDisconnect, ShieldCheck, SpeakerHigh, UserCircle } from '@phosphor-icons/react'
import type { Icon } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { RiskResult } from '../detect/score'
import type { Copy } from '../i18n'
import { AlertActions, AlertIntro } from './guard-screens'
import { RiskGauge } from './guard-ui'
import { Button } from './ui/button'

export function PhoneFrame({ children }: { children: ReactNode }) {
  return <div className="handset">
    <div className="handset-screen">
      <div className="handset-camera" aria-hidden="true" />
      {children}
      <div className="handset-home" aria-hidden="true" />
    </div>
  </div>
}

export function TapHint() {
  return <span className="tap-hint" aria-hidden="true"><HandPointing /></span>
}

export function PhoneControl({ icon: Icon, children, onClick, hint, tone, pressed, dial }: {
  icon: Icon
  children: ReactNode
  onClick?: () => void
  hint?: boolean
  tone?: 'answer' | 'decline' | 'hangup'
  pressed?: boolean
  dial?: boolean
}) {
  const content = dial
    ? <><span className="dial-key"><Icon aria-hidden="true" />{hint && <TapHint />}</span><span className="dial-label">{children}</span></>
    : <><Icon aria-hidden="true" />{children}{hint && <TapHint />}</>
  const className = dial ? 'phone-control dial-control' : 'phone-control'
  return onClick
    ? <button type="button" className={className} data-tone={tone} aria-pressed={pressed} onClick={onClick}>{content}</button>
    : <span className={className} data-tone={tone} data-pressed={pressed}>{content}</span>
}

export function CallScreen({ copy, incoming, bank, speaker = true, answer, decline, hangup, guard, highlight, ringing }: {
  copy: Copy
  incoming?: boolean
  bank?: boolean
  speaker?: boolean
  answer?: () => void
  decline?: () => void
  hangup?: () => void
  guard?: () => void
  highlight?: 'answer' | 'speaker' | 'guard'
  ringing?: boolean
}) {
  return <div className="phone-call" data-incoming={incoming || undefined} data-ringing={ringing || undefined}>
    <div className="phone-caller">
      <div className="caller-avatar" aria-hidden="true"><UserCircle /></div>
      <p className="phone-caller-name">{bank ? copy.practice.bank : copy.practice.unknown}</p>
      <p>{incoming ? copy.practice.incoming : speaker ? copy.practice.onSpeaker : copy.practice.speakerOff}</p>
    </div>
    <div className="phone-call-actions">
      {incoming ? <div className="phone-call-controls">
        {decline && <PhoneControl icon={PhoneDisconnect} tone="decline" onClick={decline} dial>{copy.practice.decline}</PhoneControl>}
        <PhoneControl icon={PhoneCall} tone="answer" onClick={answer} hint={highlight === 'answer'} dial>{copy.practice.answer}</PhoneControl>
      </div>
        : <>
          <div className="phone-call-controls">
            <PhoneControl icon={SpeakerHigh} pressed={speaker} hint={highlight === 'speaker'} dial>{copy.practice.speaker}</PhoneControl>
            <PhoneControl icon={PhoneDisconnect} tone="hangup" onClick={hangup} dial>{copy.practice.endCall}</PhoneControl>
          </div>
          {(guard || highlight === 'guard') && <GuardButton copy={copy} start={guard} hint={highlight === 'guard'} />}
        </>}
    </div>
  </div>
}

export function GuardButton({ copy, start, label, hint }: {
  copy: Copy; start?: () => void; label?: string; hint?: boolean
}) {
  return <Button className={hint ? 'tap-target' : undefined} onClick={start}>
    <Microphone aria-hidden="true" />{label ?? copy.guard}{hint && <TapHint />}
  </Button>
}

export function GuardPrompt({ copy, start, picture }: {
  copy: Copy; start?: () => void; picture?: boolean
}) {
  return <>
    {picture ? <strong>{copy.practice.realCall}</strong> : <p>{copy.speaker}</p>}
    <GuardButton copy={copy} start={start} hint={picture} />
  </>
}

export function PhoneGuard({ copy, risk, children, finished, headingRef, gaugeHint }: {
  copy: Copy; risk: RiskResult; children?: ReactNode; finished?: boolean; headingRef?: React.Ref<HTMLParagraphElement>; gaugeHint?: boolean
}) {
  return <div className="phone-guard">
    <p className="phone-brand" tabIndex={headingRef ? -1 : undefined} ref={headingRef}>
      <ShieldCheck aria-hidden="true" />{headingRef && !finished ? copy.listening : copy.brand}
    </p>
    <RiskGauge copy={copy} risk={risk} compact statusHint={gaugeHint && <TapHint />}
      verdict={finished && risk.level === 'safe' ? copy.practice.looksSafe : undefined} />
    {children}
  </div>
}

export function PhoneWarning({ copy, stop, hint, headingRef }: {
  copy: Copy; stop: () => void; hint?: boolean; headingRef?: React.Ref<HTMLHeadingElement>
}) {
  return <div className="phone-warning">
    <AlertIntro copy={copy} Heading="h3" compact headingRef={headingRef} />
    <AlertActions copy={copy} demo stop={stop} hangUpLabel={copy.practice.endCall} hint={hint && <TapHint />} />
  </div>
}
