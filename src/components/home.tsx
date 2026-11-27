import { AudioLines, Headphones, LockKeyhole, Settings as SettingsIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Copy } from '../i18n'
import { normalizeFamilyNumber, type Settings } from '../settings'
import { LandingDetails } from './landing-details'
import { LandingHero } from './landing-hero'
import { LandingGuide, PageReader } from './landing-guide'
import { TryIt } from './try-it'
import './landing.css'
import { Button } from './ui/button'

type HomeProps = {
  copy: Copy
  settings: Settings
  update: (patch: Partial<Settings>) => void
  start: () => void
  demo: () => void
  notice?: string
  hasError: boolean
}

export function Home({ copy, settings, update, start, demo, notice, hasError }: HomeProps) {
  const [panel, setPanel] = useState<'settings' | 'privacy' | null>(null)

  const page = useRef<HTMLElement>(null)

  return (
    <main ref={page} className="landing-main">
      <LandingHero copy={copy} language={settings.language} change={language => update({ language })} start={start} demo={demo} notice={notice} hasError={hasError} />
      <div className="landing-content">
        <TryIt key={settings.language} copy={copy} language={settings.language} />
        <section className="glass-card guide-banner" aria-labelledby="clip-link-title">
          <AudioLines aria-hidden="true" />
          <div><h2 id="clip-link-title" data-read>{copy.clip.title}</h2><p data-read>{copy.clip.intro}</p></div>
          <Button asChild variant="outline"><a href="#/check-clip">{copy.landing.clipLink}</a></Button>
        </section>
        <div className="landing-tools">
          <PageReader key={settings.language} copy={copy} language={settings.language} page={page} />
          <Button variant="ghost" onClick={() => setPanel('settings')}><SettingsIcon aria-hidden="true" />{copy.settings}</Button>
          <Button variant="ghost" onClick={() => setPanel('privacy')}><LockKeyhole aria-hidden="true" />{copy.privacy}</Button>
        </div>
        <LandingGuide copy={copy} />
        <LandingDetails copy={copy} />
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
        <h2 id="panel-title" tabIndex={panel === 'privacy' ? -1 : undefined}>{panel === 'settings' ? copy.settings : copy.privacy}</h2>
        {panel === 'settings' ? (
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
        <form method="dialog"><Button className="w-full" type="submit">{copy.close}</Button></form>
      </dialog>}
    </main>
  )
}
