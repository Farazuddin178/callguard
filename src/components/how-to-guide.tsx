import { BookOpen, CaretLeft, CaretRight, Printer, SpeakerHigh } from '@phosphor-icons/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Copy } from '../i18n'
import type { SpeechLanguage } from '../speech/types'
import { GuideScene, InstallScene, type Platform } from './guide-scenes'
import { LanguagePicker } from './guard-ui'
import { Button } from './ui/button'
import { useHorizontalSwipe } from './use-horizontal-swipe'
import './picture-guide.css'

export default function HowToGuide({ copy, language, change }: {
  copy: Copy; language: SpeechLanguage; change: (language: SpeechLanguage) => void
}) {
  const [page, setPage] = useState(0)
  const [install, setInstall] = useState<Platform | null>(null)
  const [voiceError, setVoiceError] = useState(false)
  const reading = useRef<SpeechSynthesisUtterance | null>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const g = copy.guide
  const steps = install ? g.installSteps[install] : g.steps
  const last = install ? steps.length - 1 : steps.length
  const end = !install && page === last
  const caption = end ? g.done : steps[page] ?? ''
  const progress = g.progress.replace('{step}', String(Math.min(page + 1, steps.length))).replace('{total}', String(steps.length))
  const swipe = useHorizontalSwipe(direction => turn(page + direction))

  useEffect(() => { title.current?.focus({ preventScroll: true }) }, [])
  useLayoutEffect(() => {
    if (matchMedia('(max-width: 40rem)').matches) window.scrollTo(0, 0)
  }, [page, install])
  useEffect(() => {
    function handleArrow(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || (event.target instanceof HTMLSelectElement)) return
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      const direction = event.key === 'ArrowLeft' ? -1 : 1
      setVoiceError(false)
      setPage(previous => Math.max(0, Math.min(last, previous + direction)))
    }
    window.addEventListener('keydown', handleArrow)
    return () => window.removeEventListener('keydown', handleArrow)
  }, [last])

  useEffect(() => () => {
    if (reading.current) {
      reading.current = null
      window.speechSynthesis.cancel()
    }
  }, [page, install, language])

  function turn(next: number) {
    setVoiceError(false)
    setPage(Math.max(0, Math.min(last, next)))
  }

  function choosePlatform(next: Platform | null) {
    setInstall(next)
    setPage(next ? 0 : g.steps.length)
    setVoiceError(false)
    title.current?.focus({ preventScroll: true })
  }

  function speak() {
    const synthesis = window.speechSynthesis
    const voices = synthesis?.getVoices().filter(voice =>
      voice.localService && voice.lang.toLowerCase().split('-')[0] === language)
    const voice = voices?.find(voice => voice.lang.toLowerCase() === language + '-in') ?? voices?.[0]
    if (!voice || !('SpeechSynthesisUtterance' in window)) {
      setVoiceError(true)
      return
    }
    setVoiceError(false)
    reading.current = null
    synthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(caption)
    utterance.voice = voice
    utterance.lang = voice.lang
    utterance.rate = 0.85
    utterance.onend = () => { if (reading.current === utterance) reading.current = null }
    utterance.onerror = () => {
      if (reading.current !== utterance) return
      reading.current = null
      setVoiceError(true)
    }
    reading.current = utterance
    synthesis.speak(utterance)
  }

  return <main className="picture-guide page-width">
    <header className="picture-header">
      <h1 ref={title} id="screen-title" tabIndex={-1}>{g.title}</h1>
      <LanguagePicker copy={copy} language={language} change={change} />
    </header>
    <div className="picture-interactive">
      {install && <div className="install-tabs" role="group" aria-label={g.install}>
        <Button variant="ghost" onClick={() => choosePlatform(null)}>{g.backToGuide}</Button>
        <Button variant="outline" aria-pressed={install === 'android'} onClick={() => choosePlatform('android')}>{g.android}</Button>
        <Button variant="outline" aria-pressed={install === 'iphone'} onClick={() => choosePlatform('iphone')}>{g.iphone}</Button>
      </div>}
      <div className="picture-spread" {...swipe}>
        <div className="picture-art" aria-hidden="true" inert>
          <div className="picture-scene" key={(install ?? 'guide') + page}>
            {end ? <BookOpen className="guide-finish-icon" aria-hidden="true" />
              : install ? <InstallScene step={page} platform={install} copy={copy} />
                : <GuideScene step={page} copy={copy} />}
          </div>
        </div>
        <div className="picture-caption">
          <h2 aria-live="polite">{caption}</h2>
          {end ? <div className="picture-end-actions">
            <Button asChild><a href="#/practice">{g.practice}</a></Button>
            <Button variant="outline" onClick={() => choosePlatform('android')}>{g.install}</Button>
          </div> : <Button variant="outline" onClick={speak}><SpeakerHigh aria-hidden="true" />{g.read}</Button>}
          {voiceError && <p role="status">{copy.landing.noVoice}</p>}
        </div>
      </div>
      <div className="picture-controls">
        <Button className="picture-back" variant="outline" disabled={page === 0} onClick={() => turn(page - 1)}><CaretLeft aria-hidden="true" />{g.back}</Button>
        <div className="guide-progress" role="img" aria-label={progress}>
          {steps.map((step, index) => <span key={step} data-current={page === index || (end && index === steps.length - 1)} />)}
        </div>
        <Button className="picture-next" disabled={page === last} onClick={() => turn(page + 1)}>{g.next}<CaretRight aria-hidden="true" /></Button>
      </div>
      <Button className="print-guide" variant="ghost" onClick={() => window.print()}><Printer aria-hidden="true" />{g.print}</Button>
    </div>
    <ol className="picture-print" role="list">{g.steps.map((step, index) => <li key={step}>
      <div className="print-art" aria-hidden="true" inert><GuideScene copy={copy} step={index} /></div>
      <p>{step}</p>
    </li>)}</ol>
  </main>
}
