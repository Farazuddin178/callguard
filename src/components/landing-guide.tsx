import { CaretLeft, CaretRight, SpeakerHigh } from '@phosphor-icons/react'
import { useEffect, useRef, useState } from 'react'
import type { Copy } from '../i18n'
import type { SpeechLanguage } from '../speech/types'
import { scorePractice } from './demo-script'
import { CallScreen, PhoneFrame, PhoneGuard, PhoneWarning } from './phone'
import { Button } from './ui/button'
import { useHorizontalSwipe } from './use-horizontal-swipe'

export function PageReader({ copy, language, page }: {
  copy: Copy; language: SpeechLanguage; page: React.RefObject<HTMLElement | null>
}) {
  const [status, setStatus] = useState<'idle' | 'reading' | 'unavailable'>('idle')
  const reading = useRef<symbol | null>(null)
  useEffect(() => () => {
    if (reading.current) window.speechSynthesis.cancel()
    reading.current = null
  }, [language])

  function toggle() {
    if (reading.current) {
      reading.current = null
      window.speechSynthesis.cancel()
      setStatus('idle')
      return
    }
    const voice = window.speechSynthesis?.getVoices().find(voice =>
      voice.localService && voice.lang.toLowerCase().split('-')[0] === language)
    if (!voice || !page.current || !('SpeechSynthesisUtterance' in window)) {
      setStatus('unavailable')
      return
    }
    const selectedVoice = voice
    const parts = Array.from(page.current.querySelectorAll<HTMLElement>('[data-read]'), node => node.textContent ?? '')
    const token = Symbol()
    function next(index: number) {
      if (reading.current !== token) return
      if (index === parts.length) {
        reading.current = null
        setStatus('idle')
        return
      }
      const utterance = new SpeechSynthesisUtterance(parts[index])
      utterance.voice = selectedVoice
      utterance.lang = selectedVoice.lang
      utterance.rate = 0.9
      utterance.onend = () => next(index + 1)
      utterance.onerror = () => {
        if (reading.current !== token) return
        reading.current = null
        setStatus('unavailable')
      }
      window.speechSynthesis.speak(utterance)
    }
    reading.current = token
    setStatus('reading')
    next(0)
  }

  return <div className="page-reader">
    <Button variant="ghost" onClick={toggle}><SpeakerHigh aria-hidden="true" />{status === 'reading' ? copy.landing.stopRead : copy.landing.read}</Button>
    {status === 'unavailable' && <p role="status">{copy.landing.noVoice}</p>}
  </div>
}

function StoryPhone({ step, copy }: { step: number; copy: Copy }) {
  return <PhoneFrame>
    {step === 0 && <CallScreen copy={copy} incoming />}
    {step === 1 && <CallScreen copy={copy} />}
    {step === 2 && <PhoneGuard copy={copy} risk={scorePractice('')}><p>{copy.listening}</p></PhoneGuard>}
    {step === 3 && <PhoneWarning copy={copy} stop={() => {}} />}
  </PhoneFrame>
}

export function CallStory({ copy }: { copy: Copy }) {
  const steps = useRef<HTMLOListElement>(null)
  const [current, setCurrent] = useState(0)
  const [pinned, setPinned] = useState(false)
  const [mobile, setMobile] = useState(false)
  const last = copy.landing.steps.length - 1
  const swipe = useHorizontalSwipe(turn)

  function turn(direction: 1 | -1) {
    setCurrent(step => Math.max(0, Math.min(last, step + direction)))
  }

  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: no-preference) and (min-width: 48rem) and (min-height: 650px)')
    const narrow = matchMedia('(max-width: 47.99rem)')
    const update = () => setPinned(query.matches && 'IntersectionObserver' in window)
    const updateMobile = () => setMobile(narrow.matches)
    update()
    updateMobile()
    query.addEventListener('change', update)
    narrow.addEventListener('change', updateMobile)
    return () => {
      query.removeEventListener('change', update)
      narrow.removeEventListener('change', updateMobile)
    }
  }, [])

  useEffect(() => {
    if (!pinned || !steps.current) return
    const beats = Array.from(steps.current.children)
    let observer: IntersectionObserver
    function observe() {
      observer?.disconnect()
      const edge = Math.floor(window.innerHeight * .47)
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(Number((entry.target as HTMLElement).dataset.beat))
        }
      }, { rootMargin: `-${edge}px 0px -${edge}px 0px` })
      for (const step of beats) observer.observe(step)
    }
    observe()
    window.addEventListener('resize', observe)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', observe)
    }
  }, [pinned])

  return <section className="call-story" aria-labelledby="how-title">
    <h2 id="how-title" data-read>{copy.landing.works}</h2>
    <div className="story-layout" data-pinned={pinned} data-carousel={mobile} {...(mobile ? swipe : {})}>
      {(pinned || mobile) && <div className="story-stage" aria-hidden="true" inert>
        <div className="story-scene" key={current}><StoryPhone step={current} copy={copy} /></div>
      </div>}
      <ol className="story-steps" ref={steps} role="list" aria-live={mobile ? 'polite' : undefined}>
        {copy.landing.steps.map((step, index) => <li key={step} data-beat={index} data-current={(pinned || mobile) && current === index}>
          <h3 data-read>{step}</h3>
          {!pinned && !mobile && <div className="story-static-scene" aria-hidden="true" inert><StoryPhone step={index} copy={copy} /></div>}
        </li>)}
      </ol>
      {mobile && <div className="story-controls">
        <Button variant="outline" disabled={current === 0} onClick={() => turn(-1)}><CaretLeft aria-hidden="true" />{copy.guide.back}</Button>
        <Button variant="outline" disabled={current === last} onClick={() => turn(1)}>{copy.guide.next}<CaretRight aria-hidden="true" /></Button>
      </div>}
    </div>
    <div className="story-note">
      <SpeakerHigh aria-hidden="true" />
      <div><p data-read>{copy.speaker}</p><p data-read>{copy.landing.honest}</p></div>
    </div>
  </section>
}
