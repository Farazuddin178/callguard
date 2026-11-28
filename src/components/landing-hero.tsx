import { ArrowCounterClockwise, BookOpen, MicrophoneSlash, PhoneDisconnect, Play } from '@phosphor-icons/react'
import { Fragment, lazy, Suspense, useEffect, useRef, useState, type ComponentType } from 'react'
import type { Copy } from '../i18n'
import type { SpeechLanguage } from '../speech/types'
import { HighlightedWords } from './check-result'
import { practiceLines, scorePractice } from './demo-script'
import { Reasons } from './guard-ui'
import { CallScreen, PhoneControl, PhoneFrame, PhoneGuard, PhoneWarning } from './phone'
import { Button } from './ui/button'
import { useHeroMotion } from './use-hero-motion'

const Tilt = lazy<ComponentType>(() => import('./phone-tilt').catch(() => ({ default: () => null })))
const Field = lazy<ComponentType>(() => import('./hero-field').catch(() => ({ default: () => null })))
type Phase = 'incoming' | 'speaker' | 'listening' | 'ended'

export function LandingHero({ copy, language, start, notice, hasError, practiceRoute }: {
  copy: Copy; language: SpeechLanguage
  start: () => void; notice?: string; hasError: boolean; practiceRoute: boolean
}) {
  const [scenario, setScenario] = useState<'scam' | 'bank'>('scam')
  const [phase, setPhase] = useState<Phase>('incoming')
  const [count, setCount] = useState(0)
  const demo = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const listeningHeading = useRef<HTMLParagraphElement>(null)
  const warningHeading = useRef<HTMLHeadingElement>(null)
  const c = copy.practice
  const lines = practiceLines(copy, scenario)
  const visibleLines = lines.slice(0, count)
  const risk = scorePractice(visibleLines.join(' '))
  const red = phase === 'listening' && risk.level === 'scam-likely'
  const finished = count >= lines.length
  const motion = useHeroMotion(stage)
  const mood = red ? 'warning' : phase === 'listening' && finished && risk.level === 'safe' ? 'safe' : 'neutral'
  const headline = copy.landing.headline.split(' ')
  const autoFocusPhone = useRef(false)

  useEffect(() => {
    if (!practiceRoute) return
    demo.current?.scrollIntoView({ block: 'nearest' })
    demo.current?.focus({ preventScroll: true })
  }, [practiceRoute])

  useEffect(() => {
    if (phase !== 'listening' || finished || red) return
    const timer = window.setTimeout(() => setCount(previous => previous + 1), count === 0 ? 650 : 2300)
    return () => window.clearTimeout(timer)
  }, [phase, count, finished, red])

  useEffect(() => {
    if (autoFocusPhone.current) {
      autoFocusPhone.current = false
      if (phase === 'listening') listeningHeading.current?.focus({ preventScroll: true })
      else demo.current?.querySelector<HTMLButtonElement>(
        phase === 'speaker' ? '.handset .cg-primary'
          : phase === 'incoming' ? '.handset [data-tone="answer"]' : '.handset button',
      )?.focus({ preventScroll: true })
    }
    const words = scroller.current
    if (phase === 'listening' && words) {
      const latest = words.querySelector<HTMLElement>('.highlighted-words:last-of-type')
      words.scrollTop = latest?.offsetTop ?? 0
    }
  }, [phase, count, red])

  useEffect(() => {
    if (red && demo.current?.contains(document.activeElement)) warningHeading.current?.focus({ preventScroll: true })
  }, [red])

  function reset(next: Phase = 'incoming', focus = false) {
    autoFocusPhone.current = focus
    setCount(0)
    setPhase(next)
  }

  function answer() {
    reset('speaker', true)
    demo.current?.scrollIntoView({ block: 'nearest' })
  }

  return <section className="landing-hero page-width">
    <div className="hero-content">
      <h1 id="screen-title" tabIndex={-1} data-read>{headline.map((word, index) =>
        <Fragment key={index}><span className="hero-word">{word}</span>{index < headline.length - 1 ? ' ' : ''}</Fragment>)}</h1>
      <p className="hero-intro" data-read>{c.intro}</p>
      <div className="home-actions">
        <Button onClick={answer}><Play aria-hidden="true" />{scenario === 'bank' ? c.tryBank : copy.sample}</Button>
        <Button variant="outline" onClick={start}>{c.realCall}</Button>
      </div>
      <Button asChild variant="ghost"><a href="#/guide"><BookOpen aria-hidden="true" />{copy.guide.title}</a></Button>
      {notice && <p className="notice" role={hasError ? 'alert' : 'status'}>{notice}</p>}
    </div>

    <section className="hero-demo" ref={demo} tabIndex={-1} aria-label={copy.demo}>
      <div className="phone-stage" ref={stage} data-awake={motion} data-mood={mood}>
        <div className="hero-field" aria-hidden="true">
          <div className="hero-contours" data-tint="neutral" />
          <div className="hero-contours" data-tint="warning" />
          <div className="hero-contours" data-tint="safe" />
          {motion && <Suspense fallback={null}><Field /></Suspense>}
        </div>
        <div className="phone-object" data-warning={red} data-ringing={phase === 'incoming'}>
          {motion && <Suspense fallback={null}><Tilt /></Suspense>}
          <PhoneFrame>
            {phase === 'incoming' || phase === 'speaker' ? <CallScreen copy={copy} incoming={phase === 'incoming'} bank={scenario === 'bank'}
              ringing={phase === 'incoming'} answer={answer} decline={() => reset('ended', true)}
              hangup={() => reset('ended', true)} guard={() => reset('listening', true)} />
              : phase === 'ended' ? <div className="phone-call phone-ended">
                <PhoneDisconnect size={52} aria-hidden="true" />
                <p role="status">{c.ended}</p>
                <Button onClick={() => reset('incoming', true)}>{c.replay}</Button>
              </div>
                : <PhoneGuard copy={copy} risk={risk} finished={finished} headingRef={listeningHeading}>
                  {red && <PhoneWarning copy={copy} stop={() => reset('ended', true)} headingRef={warningHeading} />}
                  <div className="phone-words" ref={scroller} role="log" aria-label={copy.heard} tabIndex={visibleLines.length ? 0 : undefined}>
                    {visibleLines.map((line, index) =>
                      <HighlightedWords key={index} text={line} risk={scorePractice(line)} />)}
                    {red && <Reasons copy={copy} risk={risk} language={language} />}
                  </div>
                  {!red && <PhoneControl icon={PhoneDisconnect} tone="hangup" onClick={() => reset('ended', true)}>{c.endCall}</PhoneControl>}
                </PhoneGuard>}
          </PhoneFrame>
        </div>
      </div>
      <div className="demo-controls">
        <div className="scenario-switch" role="group" aria-label={c.scenario}>
          <Button variant="outline" aria-pressed={scenario === 'scam'} onClick={() => {
            if (scenario !== 'scam') { setScenario('scam'); reset() }
          }}>{c.scam}</Button>
          <Button variant="outline" aria-pressed={scenario === 'bank'} onClick={() => {
            if (scenario !== 'bank') { setScenario('bank'); reset() }
          }}>{c.bank}</Button>
        </div>
        {(phase === 'speaker' || phase === 'listening') && <Button variant="ghost" onClick={() => reset('incoming', true)}><ArrowCounterClockwise aria-hidden="true" />{c.replay}</Button>}
      </div>
      <p className="demo-note"><MicrophoneSlash aria-hidden="true" />{copy.demoMicOff}</p>
    </section>
  </section>
}
