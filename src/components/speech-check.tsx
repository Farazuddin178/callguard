import { ChevronDown, Mic, Square } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { Copy } from '../i18n'
import type { GuardSession } from '../session/guard-session'
import { isModelSize, type Settings } from '../settings'
import { downloadSpeechRuntime } from '../speech/speech-assets'
import type { ModelProgress } from '../speech/types'
import { LanguagePicker, Preparing } from './guard-ui'
import { Button } from './ui/button'

export function SpeechCheck({ copy, settings, update, state, transcript, start, stop }: {
  copy: Copy
  settings: Settings
  update: (patch: Partial<Settings>) => void
  state: ReturnType<GuardSession['getSnapshot']>
  transcript: string
  start: () => void
  stop: () => void
}) {
  const [runtimeProgress, setRuntimeProgress] = useState<ModelProgress>()
  const [preparingRuntime, setPreparingRuntime] = useState(true)
  const format = new Intl.NumberFormat(settings.language, { maximumFractionDigits: 2 })
  const seconds = (value: number) => copy.seconds.replace('{value}', format.format(value))
  const metrics = state.metrics

  useEffect(() => {
    const download = new AbortController()
    // Opening the check prepares static files. Start alone can request the mic.
    void downloadSpeechRuntime(download.signal, progress => {
      if (!download.signal.aborted) setRuntimeProgress(progress)
    }).catch(() => {
      // Start retries preparation and can show the localized error.
    }).finally(() => {
      if (!download.signal.aborted) setPreparingRuntime(false)
    })
    return () => download.abort()
  }, [])

  return (
    <main className="screen speech-screen">
      <h1 id="screen-title" tabIndex={-1}>{copy.speechCheck}</h1>
      <p>{copy.speechHelp}</p>
      {state.error && <p className="notice" role="alert">{copy.errors[state.error]}</p>}
      {state.timedOut && <p className="notice" role="status">{copy.silence}</p>}
      {state.phase === 'idle' ? <>
        <LanguagePicker copy={copy} language={settings.language} change={language => update({ language })} />
        <label className="language-field">
          <span>{copy.modelSize}</span>
          <span className="select-wrap">
            <select value={settings.modelSize} onChange={event => {
              if (isModelSize(event.target.value)) update({ modelSize: event.target.value })
            }}>
              <option value="tiny">{copy.tiny}</option>
              <option value="base">{copy.base}</option>
              <option value="small">{copy.small}</option>
            </select>
            <ChevronDown aria-hidden="true" />
          </span>
        </label>
        {preparingRuntime && runtimeProgress && <Preparing
          copy={copy} language={settings.language} progress={runtimeProgress} awaitingMic={false}
        />}
        <Button onClick={start} disabled={preparingRuntime}><Mic aria-hidden="true" />{copy.beginCheck}</Button>
      </> : <>
        {state.phase === 'preparing' && <Preparing
          copy={copy} language={settings.language} progress={state.progress} awaitingMic={!!metrics}
        />}
        {metrics && <dl className="surface metrics">
          <div><dt>{copy.backend}</dt><dd>{copy[metrics.backend]}</dd></div>
          <div><dt>{copy.modelLoad}</dt><dd>{seconds(metrics.loadMs / 1000)}</dd></div>
          {metrics.audioSeconds !== undefined && <div>
            <dt>{copy.audioLength}</dt><dd>{seconds(metrics.audioSeconds)}</dd>
          </div>}
          {metrics.transcriptionMs !== undefined && <div>
            <dt>{copy.transcriptionTime}</dt><dd>{seconds(metrics.transcriptionMs / 1000)}</dd>
          </div>}
        </dl>}
        {state.phase === 'listening' && <section className="surface speech-text">
          <h2>{copy.heard}</h2>
          <p>{transcript || copy.speakNow}</p>
        </section>}
        <div className="bottom-action">
          <Button className="w-full" onClick={stop}><Square aria-hidden="true" size={21} />{copy.stop}</Button>
        </div>
      </>}
      <Button asChild variant="ghost"><a href="#/" onClick={stop}>{copy.home}</a></Button>
    </main>
  )
}
