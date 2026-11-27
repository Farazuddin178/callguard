import { BadgeIndianRupee, Banknote, Clock3, Globe, KeyRound, Link2, LockKeyhole, MessageCircleOff, Mic, Package, PhoneIncoming, PhoneOff, Shield, Smartphone, Trash2, Volume2, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Copy } from '../i18n'
import type { SpeechLanguage } from '../speech/types'
import { Button } from './ui/button'

const steps = [PhoneIncoming, Volume2, Mic, PhoneOff]
const tactics = [KeyRound, Shield, LockKeyhole, MessageCircleOff, Clock3, Link2, Banknote, Package, Zap, BadgeIndianRupee]
const promises = [Mic, LockKeyhole, Trash2]

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
    if (!voice || !page.current) {
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
  return (
    <div>
      <Button variant="outline" onClick={toggle}><Volume2 aria-hidden="true" />{status === 'reading' ? copy.landing.stopRead : copy.landing.read}</Button>
      {status === 'unavailable' && <p role="status">{copy.landing.noVoice}</p>}
    </div>
  )
}

export function LandingGuide({ copy }: { copy: Copy }) {
  const c = copy.landing
  return (
    <>
      <section className="guide-block" aria-labelledby="how-title">
        <h2 id="how-title" data-read>{c.works}</h2>
        <ol className="guide-steps" role="list">{c.steps.map((step, index) => {
          const Icon = steps[index]!
          return <li className="glass-card" key={step}><div className="guide-illustration"><Icon aria-hidden="true" /><span aria-hidden="true">{index + 1}</span></div><p data-read>{step}</p></li>
        })}</ol>
      </section>
      <section className="guide-block" aria-labelledby="tricks-title">
        <h2 id="tricks-title" data-read>{c.tricks}</h2>
        <div className="trick-grid">{c.tactics.map(([title, example], index) => {
          const Icon = tactics[index]!
          return <article className="glass-card" key={title}><Icon aria-hidden="true" /><h3 data-read>{title}</h3><p data-read>“{example}”</p></article>
        })}</div>
        <p className="guide-emphasis" data-read>{c.real}</p>
      </section>
      <section className="guide-block" id="privacy" aria-labelledby="privacy-title">
        <h2 id="privacy-title" data-read>{c.privacyTitle}</h2>
        <div className="promise-grid">{c.promises.map((promise, index) => {
          const Icon = promises[index]!
          return <div className="glass-card" key={promise}><Icon aria-hidden="true" /><p data-read>{promise}</p></div>
        })}</div>
      </section>
      <section className="glass-card guide-banner" aria-labelledby="languages-title">
        <Globe aria-hidden="true" />
        <div><h2 id="languages-title" data-read>{c.languages}</h2>
          <ul className="guide-languages" role="list" data-read>{(['te', 'hi', 'en'] as const).map(lang =>
            <li key={lang} lang={lang}>{copy.languageNames[lang]}</li>)}</ul>
        </div>
      </section>
      <section className="glass-card guide-banner guide-danger" aria-labelledby="danger-title">
        <PhoneOff aria-hidden="true" />
        <div><h2 id="danger-title" data-read>{c.danger}</h2><p data-read>{c.national}</p><p data-read>{c.report}</p>
          <a href="https://cybercrime.gov.in">cybercrime.gov.in</a></div>
        <Button asChild><a href="tel:1930" data-read>{copy.helpline}</a></Button>
      </section>
      <aside className="glass-card guide-banner">
        <Smartphone aria-hidden="true" />
        <div><p data-read>{copy.speaker}</p><p data-read>{c.honest}</p></div>
      </aside>
    </>
  )
}
