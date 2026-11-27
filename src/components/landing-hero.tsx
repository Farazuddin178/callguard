import { AlertTriangle, Mic, Play, ShieldCheck } from 'lucide-react'
import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { Copy } from '../i18n'
import type { SpeechLanguage } from '../speech/types'
import { LanguagePicker } from './guard-ui'
import { Button } from './ui/button'

const Arc = lazy(() => import('./landing-arc').catch(() => ({ default: () => <></> })))

function useHeroMotion() {
  const hero = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const device = navigator as Navigator & { deviceMemory?: number; connection?: EventTarget & { saveData?: boolean } }
    if (device.hardwareConcurrency <= 4 || (device.deviceMemory ?? Infinity) <= 4) return
    const section = hero.current
    if (!section) return
    let intersecting = false
    let frame = 0
    const refresh = () => {
      cancelAnimationFrame(frame)
      if (!intersecting || document.hidden || reduced.matches || device.connection?.saveData) {
        setVisible(false)
        return
      }
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => setVisible(true))
      })
    }
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry?.isIntersecting ?? false
      refresh()
    })
    observer.observe(section)
    reduced.addEventListener('change', refresh)
    device.connection?.addEventListener('change', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      reduced.removeEventListener('change', refresh)
      device.connection?.removeEventListener('change', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [])
  return { hero, visible }
}

const bars = [22, 32, 49, 33, 65, 39, 83, 54, 100, 64, 43, 75, 54, 32, 53, 28, 40, 23]

export function LandingHero({ copy, language, change, start, demo, notice, hasError }: {
  copy: Copy; language: SpeechLanguage; change: (language: SpeechLanguage) => void
  start: () => void; demo: () => void; notice?: string; hasError: boolean
}) {
  const { hero, visible } = useHeroMotion()
  return (
    <section className="landing-hero" ref={hero}>
      <div className="hero-effect" aria-hidden="true">
        {visible && <Suspense fallback={null}><Arc /></Suspense>}
      </div>
      <div className="hero-inner">
        <div className="hero-content">
          <LanguagePicker copy={copy} language={language} change={change} />
          <h1 id="screen-title" tabIndex={-1} data-read>{copy.landing.headline}</h1>
          <div className="home-actions">
            <Button className="hero-guard" onClick={start}><Mic aria-hidden="true" />{copy.guard}</Button>
            <Button variant="outline" onClick={demo}><Play aria-hidden="true" />{copy.sample}</Button>
          </div>
          {notice && <p className="notice" role={hasError ? 'alert' : 'status'}>{notice}</p>}
        </div>
        <div className="phone-preview" aria-hidden="true" data-motion={visible}>
          <div className="phone-frame">
            <div className="phone-camera" />
            <div className="phone-display">
              <span>{copy.landing.preview}</span>
              <div className="phone-status">
                <div className="phone-safe"><ShieldCheck />{copy.safe}</div>
                <div className="phone-alert"><AlertTriangle />{copy.hangUp}</div>
              </div>
              <div className="phone-wave">{bars.map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
