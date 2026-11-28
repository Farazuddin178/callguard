import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Listening, RedAlert } from './components/guard-screens'
import { TopBar } from './components/guard-ui'
import { CheckClip } from './components/check-clip'
import { Home } from './components/home'
import { SpeechCheck } from './components/speech-check'
import { getCopy } from './i18n'
import { GuardSession } from './session/guard-session'
import { loadSettings, saveSettings, type Settings } from './settings'
import { MockSpeechSource } from './speech/mock'
import { speakWarning } from './speech/speech-warning'
import { WhisperSpeechSource } from './speech/whisper'

const HowToGuide = lazy(() => import('./components/how-to-guide'))

export function App() {
  const [settings, setSettings] = useState(loadSettings)
  const [session] = useState(() => new GuardSession())
  const [testMode, setTestMode] = useState(false)
  const [route, setRoute] = useState(() => location.hash)
  const checkPage = route === '#/speech-check'
  const clipPage = route === '#/check-clip'
  const guidePage = route === '#/guide'
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot)
  const copy = getCopy(settings.language)
  const active = state.phase !== 'idle'
  const red = !checkPage && !clipPage && !guidePage && active && state.risk.level === 'scam-likely'
  const screen = checkPage ? 'check' : clipPage ? 'clip' : guidePage ? 'guide' : red ? 'alert' : active ? 'live' : 'home'
  const lastScreen = useRef(screen)
  const notice = state.error ? copy.errors[state.error] : state.timedOut ? copy.silence : undefined

  useEffect(() => {
    document.documentElement.lang = settings.language
  }, [settings.language])

  useEffect(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.getVoices()
    function navigate() {
      session.stop()
      setRoute(location.hash)
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
    if (!red || testMode) return
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigator.vibrate?.(180)
    return speakWarning(copy.warning, settings.language)
  }, [red, testMode, copy.warning, settings.language])

  function update(patch: Partial<Settings>) {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }

  function guard() {
    const mock = import.meta.env.MODE === 'test' && new URLSearchParams(location.search).get('speech') === 'mock'
    setTestMode(mock)
    session.start(mock ? new MockSpeechSource(copy.demoLines, true) : new WhisperSpeechSource(settings.language))
  }

  const screenProps = { copy, settings, state, stop: session.stop }
  const navigation = screen === 'home' || screen === 'clip' || screen === 'guide'
  return (
    <div className={red ? 'app-shell alert-shell' : navigation ? 'app-shell landing' : 'app-shell'}>
      {screen !== 'home' && <TopBar copy={copy} microphone={state.microphoneActive} navigation={navigation} guidePage={guidePage} test={!navigation && !checkPage && active && testMode} />}
      {screen === 'check' ? <SpeechCheck {...screenProps} update={update} transcript={session.getTranscript()}
        start={() => session.start(new WhisperSpeechSource(settings.language, settings.modelSize))} />
        : screen === 'clip' ? <CheckClip copy={copy} settings={settings} />
        : screen === 'guide' ? <Suspense fallback={null}><HowToGuide copy={copy} language={settings.language} change={language => update({ language })} /></Suspense>
        : screen === 'alert' ? <RedAlert {...screenProps} />
          : screen === 'live' ? <Listening {...screenProps} />
            : <Home copy={copy} settings={settings} update={update} start={guard} practiceRoute={route === '#/practice'}
                notice={notice} hasError={!!state.error} />}
    </div>
  )
}
