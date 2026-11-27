import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Listening, RedAlert } from './components/guard-screens'
import { TopBar } from './components/guard-ui'
import { Home } from './components/home'
import { SpeechCheck } from './components/speech-check'
import { getCopy } from './i18n'
import { GuardSession } from './session/guard-session'
import { loadSettings, saveSettings, type Settings } from './settings'
import { MockSpeechSource } from './speech/mock'
import { speakWarning } from './speech/speech-warning'
import { WhisperSpeechSource } from './speech/whisper'

type Mode = 'call' | 'demo' | 'test'

export function App() {
  const [settings, setSettings] = useState(loadSettings)
  const [session] = useState(() => new GuardSession())
  const [mode, setMode] = useState<Mode>('call')
  const [checkPage, setCheckPage] = useState(() => location.hash === '#/speech-check')
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const copy = getCopy(settings.language)
  const active = state.phase !== 'idle'
  const red = !checkPage && active && state.risk.level === 'scam-likely'
  const screen = checkPage ? 'check' : red ? 'alert' : active ? 'live' : 'home'
  const lastScreen = useRef(screen)
  const demo = !checkPage && active && mode === 'demo'
  const notice = state.error ? copy.errors[state.error] : state.timedOut ? copy.silence : undefined

  useEffect(() => {
    document.documentElement.lang = settings.language
  }, [settings.language])

  useEffect(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.getVoices()
    function navigate() {
      session.stop()
      setCheckPage(location.hash === '#/speech-check')
    }
    function stopWhenHidden() {
      if (document.hidden) session.stop()
    }
    window.addEventListener('hashchange', navigate)
    window.addEventListener('pagehide', session.stop)
    document.addEventListener('visibilitychange', stopWhenHidden)
    return () => {
      window.removeEventListener('hashchange', navigate)
      window.removeEventListener('pagehide', session.stop)
      document.removeEventListener('visibilitychange', stopWhenHidden)
      session.stop()
    }
  }, [session])

  useLayoutEffect(() => {
    if (lastScreen.current === screen) return
    lastScreen.current = screen
    window.scrollTo(0, 0)
    document.getElementById('screen-title')?.focus({ preventScroll: true })
  }, [screen])

  useEffect(() => {
    if (!red || mode === 'test') return
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(180)
    return speakWarning(copy.warning, settings.language)
  }, [red, mode, copy.warning, settings.language])

  function update(patch: Partial<Settings>) {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }

  function start(mode: Mode) {
    setMode(mode)
    session.start(mode === 'call'
      ? new WhisperSpeechSource(settings.language)
      : new MockSpeechSource(copy.demoLines, mode === 'test'))
  }

  function guard() {
    if (import.meta.env.MODE === 'test' && new URLSearchParams(location.search).get('speech') === 'mock') {
      start('test')
    } else {
      start('call')
    }
  }

  const screenProps = { copy, settings, state, stop: session.stop }
  return (
    <div className={red ? 'app-shell alert-shell' : 'app-shell'}>
      <TopBar copy={copy} microphone={state.microphoneActive} demo={demo} test={!checkPage && active && mode === 'test'} />
      {screen === 'check' ? <SpeechCheck {...screenProps} update={update} transcript={session.getTranscript()}
        start={() => session.start(new WhisperSpeechSource(settings.language, settings.modelSize))} />
        : screen === 'alert' ? <RedAlert {...screenProps} demo={demo} />
          : screen === 'live' ? <Listening {...screenProps} />
            : <Home copy={copy} settings={settings} update={update} start={guard} demo={() => start('demo')}
                notice={notice} hasError={!!state.error} />}
    </div>
  )
}
