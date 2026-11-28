import { BookOpen, Gear as SettingsIcon, Headphones } from '@phosphor-icons/react'
import { lazy, Suspense, useRef, useState } from 'react'
import { getCopy, type Copy } from '../i18n'
import { normalizeFamilyNumber, type Settings } from '../settings'
import { LandingDetails, LandingFooter } from './landing-details'
import { LandingHero } from './landing-hero'
import { CallStory, PageReader } from './landing-guide'
import { GuardPrompt } from './phone'
import { LanguagePicker, TopBar } from './guard-ui'
import { SampleWaveform } from './sample-waveform'
import { TryIt } from './try-it'
import './landing.css'
import { Button } from './ui/button'

type HomeProps = {
  copy: Copy
  settings: Settings
  update: (patch: Partial<Settings>) => void
  start: () => void
  practiceRoute: boolean
  notice?: string
  hasError: boolean
}

const ScamGame = lazy(() => import('./scam-game'))

export function Home({ copy, settings, update, start, practiceRoute, notice, hasError }: HomeProps) {
  const [panel, setPanel] = useState<'guard' | 'settings' | 'privacy' | null>(null)

  const page = useRef<HTMLElement>(null)

  return (
    <>
      <TopBar copy={copy} microphone={false} navigation tools={<>
        <div className="topbar-language">
          <LanguagePicker copy={copy} language={settings.language} change={language => update({ language })} compact />
        </div>
        <PageReader key={settings.language} copy={copy} language={settings.language} page={page} />
        <Button variant="ghost" onClick={() => setPanel('settings')}><SettingsIcon aria-hidden="true" />{copy.settings}</Button>
      </>} />
      <main ref={page} className="landing-main">
        <LandingHero key={settings.language} copy={copy} language={settings.language} start={() => setPanel('guard')}
          practiceRoute={practiceRoute} notice={notice} hasError={hasError} />
        <div className="landing-content page-width">
          <section className="guide-preview" aria-labelledby="guide-preview-title">
            <BookOpen aria-hidden="true" />
            <div><h2 id="guide-preview-title" data-read>{copy.guide.title}</h2><p data-read>{copy.guide.preview}</p></div>
            <Button asChild variant="outline"><a href="#/guide">{copy.guide.open}</a></Button>
          </section>
          <CallStory copy={copy} />
          <Suspense fallback={null}><ScamGame key={settings.language} copy={copy} language={settings.language} /></Suspense>
          <TryIt key={settings.language} copy={copy} language={settings.language} />
          <section className="clip-strip" aria-labelledby="clip-link-title">
            <SampleWaveform />
            <div>
              <h2 id="clip-link-title" data-read>{copy.clip.title}</h2>
              <p data-read>{copy.landing.clipSummary}</p>
              <Button asChild variant="outline"><a href="#/check-clip">{copy.landing.clipLink}</a></Button>
            </div>
          </section>
          <section className="languages-section" aria-labelledby="language-showcase">
            <h2 id="language-showcase" data-read>{copy.landing.languages}</h2>
            <dl>{(['te', 'hi', 'en'] as const).map(lang =>
              <div key={lang} lang={lang}><dt>{copy.languageNames[lang]}</dt><dd>{getCopy(lang).hangUp}</dd></div>)}</dl>
          </section>
          <LandingDetails copy={copy} openPrivacy={() => setPanel('privacy')} />
        </div>
        {panel && <dialog
          className="sheet"
          ref={dialog => {
            if (!dialog || dialog.open) return
            dialog.showModal()
            if (panel === 'privacy') {
              dialog.querySelector<HTMLElement>('#panel-title')?.focus({ preventScroll: true })
              dialog.scrollTop = 0
            }
          }}
          onClose={() => setPanel(null)}
          aria-labelledby="panel-title"
        >
          <h2 id="panel-title" tabIndex={panel === 'privacy' ? -1 : undefined}>
            {panel === 'guard' ? copy.practice.realCall : panel === 'settings' ? copy.settings : copy.privacy}
          </h2>
          {panel === 'guard' ? <GuardPrompt copy={copy} start={() => {
            setPanel(null)
            start()
          }} /> : panel === 'settings' ? (
            <div className="panel-content">
              <label className="toggle">
                <input type="checkbox" role="switch" checked={settings.familyAlert} aria-describedby="family-help"
                  onChange={event => update({ familyAlert: event.target.checked })} />
                <span>{copy.familySetting}</span>
                <span className="toggle-state" aria-hidden="true">
                  <span className="toggle-track" />
                  {settings.familyAlert ? copy.switchOn : copy.switchOff}
                </span>
              </label>
              <p id="family-help">{copy.familyHelp}</p>
              {settings.familyAlert && <div className="field">
                <label htmlFor="family-number">{copy.familyNumber}</label>
                <input id="family-number" type="tel" autoComplete="off" aria-describedby="number-help" value={settings.familyNumber}
                  onChange={event => update({ familyNumber: normalizeFamilyNumber(event.target.value) })} />
                <p id="number-help">{copy.familyNumberHelp}</p>
              </div>}
              <Button asChild variant="outline" className="w-full">
                <a href="#/speech-check"><Headphones aria-hidden="true" />{copy.speechCheck}</a>
              </Button>
            </div>
          ) : (
            <div className="panel-content">
              <p>{copy.privacyListening}</p>
              <p>{copy.privacyLocal}</p>
              <p>{copy.privacyMemory}</p>
              <p>{copy.privacyDownload}</p>
              <p>{copy.privacySettings}</p>
              <p>{copy.privacyFamily}</p>
            </div>
          )}
          <form method="dialog"><Button className="w-full" type="submit" variant={panel === 'guard' ? 'outline' : undefined}>{copy.close}</Button></form>
        </dialog>}
      </main>
      <LandingFooter copy={copy} />
    </>
  )
}
