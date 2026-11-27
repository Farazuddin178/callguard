import { Headphones, LockKeyhole, Mic, Play, Settings as SettingsIcon, Volume2 } from 'lucide-react'
import { useState } from 'react'
import type { Copy } from '../i18n'
import { normalizeFamilyNumber, type Settings } from '../settings'
import { LanguagePicker } from './guard-ui'
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

  return (
    <main className="screen home-screen">
      <LanguagePicker copy={copy} language={settings.language} change={language => update({ language })} />
      <div className="home-intro">
        <h1 id="screen-title" tabIndex={-1}>{copy.homeTitle}</h1>
        <p className="speaker-note"><Volume2 aria-hidden="true" />{copy.speaker}</p>
      </div>
      {notice && <p className="notice" role={hasError ? 'alert' : 'status'}>{notice}</p>}
      <div className="home-actions">
        <Button className="guard-button w-full" onClick={start}><Mic aria-hidden="true" />{copy.guard}</Button>
        <Button className="w-full" variant="outline" onClick={demo}><Play aria-hidden="true" />{copy.sample}</Button>
      </div>
      <div className="home-tools">
        <Button variant="ghost" onClick={() => setPanel('settings')}><SettingsIcon aria-hidden="true" />{copy.settings}</Button>
        <Button variant="ghost" onClick={() => setPanel('privacy')}><LockKeyhole aria-hidden="true" />{copy.privacy}</Button>
      </div>
      {panel && <dialog
        className="sheet"
        ref={dialog => { if (dialog && !dialog.open) dialog.showModal() }}
        onClose={() => setPanel(null)}
        aria-labelledby="panel-title"
      >
        <h2 id="panel-title">{panel === 'settings' ? copy.settings : copy.privacy}</h2>
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
            <p>{copy.privacyLocal}</p>
            <p>{copy.privacyMemory}</p>
            <p>{copy.privacyDownload}</p>
            <p>{copy.privacySettings}</p>
            <p>{copy.speaker}</p>
          </div>
        )}
        <form method="dialog"><Button className="w-full" type="submit">{copy.close}</Button></form>
      </dialog>}
    </main>
  )
}
