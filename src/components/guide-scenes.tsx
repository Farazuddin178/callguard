import { AndroidLogo, AppleLogo, Check, DeviceMobile, DotsThreeVertical, DownloadSimple, Export, HandPalm, House, Phone, ShieldCheck, Table, Users } from '@phosphor-icons/react'
import type { Copy } from '../i18n'
import { scorePractice } from './demo-script'
import { CallScreen, GuardPrompt, PhoneControl, PhoneFrame, PhoneGuard, PhoneWarning, TapHint } from './phone'
import { Button } from './ui/button'

export type Platform = 'android' | 'iphone'

export function GuideScene({ step, copy }: { step: number; copy: Copy }) {
  if (step === 4) return <div className="guide-object guide-table">
    <Table aria-hidden="true" /><DeviceMobile aria-hidden="true" /><HandPalm aria-hidden="true" />
  </div>

  return <PhoneFrame>
    {step === 0 && <CallScreen copy={copy} incoming highlight="answer" />}
    {step === 1 && <CallScreen copy={copy} speaker={false} highlight="speaker" />}
    {step === 2 && <div className="guide-home-screen">
      <House aria-hidden="true" size={32} />
      <span className="guide-app-icon"><img src="/icon-192.png" alt="" width={52} height={52} />{copy.brand}<TapHint /></span>
    </div>}
    {step === 3 && <div className="guide-start-screen">
      <ShieldCheck aria-hidden="true" size={56} />
      <GuardPrompt copy={copy} picture />
    </div>}
    {step === 5 && <PhoneGuard copy={copy} risk={scorePractice('')} finished gaugeHint />}
    {step === 6 && <PhoneWarning copy={copy} stop={() => {}} hint />}
    {step === 7 && <div className="guide-help-screen">
      <Button className="tap-target"><Phone aria-hidden="true" />{copy.helpline}<TapHint /></Button>
      <Button variant="outline"><Users aria-hidden="true" />{copy.guide.family}</Button>
    </div>}
  </PhoneFrame>
}

export function InstallScene({ step, platform, copy }: { step: number; platform: Platform; copy: Copy }) {
  const apple = platform === 'iphone'
  const g = copy.guide
  return <PhoneFrame>
    <div className="install-scene" data-platform={platform} data-step={step}>
      <div className="install-browser">
        <span>{copy.brand}</span>
        {step === 0 && !apple && <PhoneControl icon={DotsThreeVertical} hint>{g.menu}</PhoneControl>}
        {step === 0 && apple && <DotsThreeVertical aria-hidden="true" />}
      </div>
      <div className="install-picture">
        {step === 2
          ? <img src="/icon-192.png" alt="" width={46} height={46} />
          : apple ? <AppleLogo aria-hidden="true" size={48} /> : <AndroidLogo aria-hidden="true" size={48} />}
        {apple && step === 2 && <p className="install-app-switch">{g.webApp}<Check aria-hidden="true" /></p>}
        {step === 0 && apple && <PhoneControl icon={Export} hint>{g.share}</PhoneControl>}
        {step === 1 && <PhoneControl icon={DownloadSimple} hint>{apple ? g.addHome : g.installShortcut}</PhoneControl>}
        {step === 2 && <PhoneControl icon={Check} hint>{apple ? g.add : g.installApp}</PhoneControl>}
      </div>
    </div>
  </PhoneFrame>
}
