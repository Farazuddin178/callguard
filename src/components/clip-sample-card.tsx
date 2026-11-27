import { AudioLines, Pause, Play } from 'lucide-react'
import { useRef, useState } from 'react'
import type { Copy } from '../i18n'
import type { SpeechLanguage } from '../speech/types'
import { Button } from './ui/button'

export type ClipSample = { id: string; lang: SpeechLanguage; title: string }

export function ClipSampleCard({ sample, copy, busy, activate, check }: {
  sample: ClipSample
  copy: Copy
  busy: boolean
  activate: (audio: HTMLAudioElement) => void
  check: () => void
}) {
  const audio = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [opened, setOpened] = useState(false)
  const [failed, setFailed] = useState(false)
  const c = copy.clip
  return (
    <article className="glass-card clip-sample" aria-labelledby={`sample-${sample.id}`}>
      <div className="clip-sample-meta">
        <AudioLines aria-hidden="true" />
        <span lang={sample.lang}>{copy.languageNames[sample.lang]}</span>
        <span className="voice-tag">{c.computerVoice}</span>
      </div>
      <h3 id={`sample-${sample.id}`} lang={sample.lang}>{sample.title}</h3>
      {/* The accessible button drives the native player. Media loads only when requested. */}
      <audio ref={audio} className="clip-sample-player" controls={opened && !busy} hidden={!opened || busy} aria-label={sample.title} src={`/samples/${sample.id}.mp3`} preload="none"
        onPlay={event => { activate(event.currentTarget); setPlaying(true) }}
        onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
      {failed && <p role="alert">{c.sampleError}</p>}
      <div className="clip-card-actions">
        <Button variant="outline" disabled={busy} onClick={() => {
          const player = audio.current
          if (!player) return
          if (!player.paused) {
            player.pause()
            return
          }
          setFailed(false)
          setOpened(true)
          void player.play().catch((error: unknown) => {
            if (!(error instanceof DOMException && error.name === 'AbortError')) setFailed(true)
          })
        }}>{playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}{playing ? c.stopPlay : c.listen}</Button>
        <Button className="clip-card-check" disabled={busy} onClick={check}>{c.check}</Button>
      </div>
    </article>
  )
}
