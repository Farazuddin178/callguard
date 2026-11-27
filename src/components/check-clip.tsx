import { AudioLines, ChevronDown, FileAudio, LockKeyhole, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { scoreClip } from '../detect/clip-score'
import type { Copy } from '../i18n'
import { isLanguage, type Settings } from '../settings'
import { decodeVoiceClip, MAX_CLIP_BYTES } from '../speech/clip-audio'
import { requestSampleAsset } from '../speech/speech-assets'
import type { ModelProgress, SpeechLanguage } from '../speech/types'
import { configuredTeluguModel, type WhisperLanguage } from '../speech/whisper-protocol'
import { CheckResult } from './check-result'
import { ClipSampleCard, type ClipSample } from './clip-sample-card'
import { Preparing } from './guard-ui'
import { Button } from './ui/button'

type ClipSource = File | ClipSample
type Phase = 'idle' | 'opening' | 'loading' | 'writing' | 'done' | 'decodeError' | 'speechError' | 'noWords'
const languages = ['en', 'hi', 'te'] as const
const teluguModel = configuredTeluguModel(import.meta.env.VITE_TELUGU_WHISPER_MODEL_ID)
const usesLargerModel = (language: WhisperLanguage) => language === 'hi' || language === 'te'

export function CheckClip({ copy, settings }: { copy: Copy; settings: Settings }) {
  const c = copy.clip
  const [samples, setSamples] = useState<ClipSample[]>([])
  const [sampleError, setSampleError] = useState(false)
  const [sampleLanguage, setSampleLanguage] = useState<SpeechLanguage>(settings.language)
  const [file, setFile] = useState<File>()
  const [language, setLanguage] = useState<WhisperLanguage>(settings.language)
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState<ModelProgress>()
  const [text, setText] = useState('')
  const [dragging, setDragging] = useState(false)
  const work = useRef<AbortController | null>(null)
  const player = useRef<HTMLAudioElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const resultPanel = useRef<HTMLElement>(null)
  const busy = phase === 'opening' || phase === 'loading' || phase === 'writing'
  const showLargerDownload = [language, sampleLanguage].some(lang => usesLargerModel(lang) && !(lang === 'te' && teluguModel))
  const showTeluguDownload = teluguModel && (language === 'te' || sampleLanguage === 'te')
  const risk = text || phase === 'writing' ? scoreClip(text) : undefined
  const verdict = risk?.level === 'safe' ? c.genuine : risk ? copy[risk.level] : undefined

  useEffect(() => {
    const load = new AbortController()
    void (async () => {
      try {
        const response = await requestSampleAsset('manifest.json', load.signal)
        if (!response.ok) throw new Error('Samples unavailable')
        const list = await response.json() as ClipSample[]
        if (!load.signal.aborted) setSamples(list.filter(item => /^[a-z0-9-]+$/.test(item.id) && isLanguage(item.lang)))
      } catch {
        if (!load.signal.aborted) setSampleError(true)
      }
    })()
    function cancelActivity() {
      work.current?.abort()
      work.current = null
      player.current?.pause()
    }
    function clearOnLeave() {
      cancelActivity()
      setText('')
      setPhase('idle')
      setProgress(undefined)
      setFile(undefined)
      if (input.current) input.current.value = ''
    }
    window.addEventListener('pagehide', clearOnLeave)
    return () => {
      load.abort()
      cancelActivity()
      window.removeEventListener('pagehide', clearOnLeave)
    }
  }, [])

  function reset() {
    work.current?.abort()
    work.current = null
    player.current?.pause()
    setText('')
    setProgress(undefined)
    setPhase('idle')
  }

  function activatePlayer(audio: HTMLAudioElement) {
    if (player.current !== audio) player.current?.pause()
    player.current = audio
  }

  function chooseFile(next: File | undefined) {
    reset()
    setFile(next)
  }

  async function check(source: ClipSource) {
    if (work.current) return
    reset()
    const controller = new AbortController()
    const { signal } = controller
    work.current = controller
    setPhase('opening')
    resultPanel.current?.focus({ preventScroll: true })
    resultPanel.current?.scrollIntoView({ block: 'nearest' })
    let decoded: Float32Array | undefined
    const sourceLanguage = source instanceof File ? language : source.lang
    const modelSize = usesLargerModel(sourceLanguage) ? 'small' : 'base'
    const modelId = sourceLanguage === 'te' ? teluguModel : undefined
    try {
      let bytes: ArrayBuffer
      if (source instanceof File) {
        if (source.size > MAX_CLIP_BYTES) throw new Error('Clip too large')
        bytes = await source.arrayBuffer()
      } else {
        const response = await requestSampleAsset(`${source.id}.mp3`, signal)
        if (!response.ok) throw new Error('Sample unavailable')
        bytes = await response.arrayBuffer()
      }
      decoded = await decodeVoiceClip(bytes, signal)
      setPhase('loading')
      const { transcribeClip } = await import('../speech/clip-whisper')
      signal.throwIfAborted()
      let heard = false
      await transcribeClip(decoded, sourceLanguage, modelSize, signal, {
        progress: setProgress,
        ready: () => setPhase('writing'),
        words: words => {
          heard = true
          setText(previous => previous ? `${previous} ${words}` : words)
        },
      }, modelId)
      if (!signal.aborted) setPhase(heard ? 'done' : 'noWords')
    } catch {
      if (!signal.aborted) {
        setText('')
        setPhase(decoded ? 'speechError' : 'decodeError')
      }
    } finally {
      decoded?.fill(0)
      if (work.current === controller) work.current = null
    }
  }

  return (
    <main className="landing-content clip-page">
      <Button className="clip-back" asChild variant="outline"><a href="#/">{copy.home}</a></Button>
      <header className="clip-intro">
        <span className="clip-intro-icon"><AudioLines aria-hidden="true" /></span>
        <div>
          <h1 id="screen-title" tabIndex={-1}>{c.title}</h1>
          <p>{c.intro}</p>
        </div>
        <p className="clip-privacy"><LockKeyhole aria-hidden="true" />{c.privacy}</p>
        <p className="clip-language-note">{c.teluguBeta}</p>
        {showLargerDownload && <p className="clip-language-note">{c.largerDownload}</p>}
        {showTeluguDownload && <p className="clip-language-note">{c.teluguDownload}</p>}
      </header>
      <section className="glass-card clip-input" aria-labelledby="clip-upload">
        <h2 id="clip-upload">{c.file}</h2>
        <div className="field">
          <label htmlFor="clip-language">{c.language}</label>
          <span className="select-wrap"><select id="clip-language" value={language} disabled={busy} onChange={event => {
            const value = event.target.value
            if (value !== 'auto' && !isLanguage(value)) return
            reset()
            setLanguage(value)
          }}>
            <option value="auto">{c.auto}</option>
            {languages.map(lang => <option key={lang} value={lang} lang={lang}>{copy.languageNames[lang]}</option>)}
          </select><ChevronDown aria-hidden="true" /></span>
        </div>
        <label className="clip-drop" data-dragging={dragging} aria-disabled={busy}
          onDragOver={event => { event.preventDefault(); if (!busy) setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={event => {
            event.preventDefault()
            setDragging(false)
            if (busy || !event.dataTransfer.files.length) return
            if (input.current) input.current.value = ''
            chooseFile(event.dataTransfer.files[0])
          }}>
          <input ref={input} type="file" className="sr-only" accept="audio/*,.mp3,.m4a,.wav,.ogg,.webm" disabled={busy}
            aria-labelledby="clip-choose" aria-describedby="clip-formats"
            onChange={event => chooseFile(event.target.files?.[0])} />
          <Upload className="clip-upload-icon" aria-hidden="true" />
          <span id="clip-choose" className="clip-upload-button">{c.chooseFile}</span>
          <span>{c.dropHere}</span>
          <span id="clip-formats" className="clip-format">{c.formats}</span>
        </label>
        {file && <div className="clip-selected">
          <FileAudio aria-hidden="true" /><span dir="auto">{file.name}</span>
          <Button disabled={busy} onClick={() => void check(file)}>{c.check}</Button>
        </div>}
      </section>
      <section ref={resultPanel} className="clip-output" tabIndex={-1}
        aria-label={copy.heard}>
        {(busy || phase !== 'idle' || !!file) && <div className="clip-output-actions">
          <Button variant="outline" onClick={() => {
            reset()
            setFile(undefined)
            if (input.current) input.current.value = ''
          }}>{busy ? copy.stop : c.clear}</Button>
        </div>}
        {phase === 'opening' && <p role="status">{c.opening}</p>}
        {phase === 'loading' && (progress ? <Preparing copy={copy} progress={progress} language={settings.language} awaitingMic={false} />
          : <p role="status">{c.opening}</p>)}
        {phase === 'writing' && <p role="status">{c.writing}</p>}
        {(phase === 'decodeError' || phase === 'speechError' || phase === 'noWords') && <p className="notice" role="alert">{c[phase]}</p>}
        {risk && <CheckResult copy={copy} language={settings.language} text={text} risk={risk}
          variant="clip" verdict={phase === 'done' ? verdict : undefined} />}
        {phase === 'done' && <p>{c.caution}</p>}
      </section>
      <section className="guide-block clip-library" aria-labelledby="clip-library-title">
        <h2 id="clip-library-title">{c.library}</h2>
        <div className="example-chips" role="group" aria-label={c.sampleLanguage}>
          {languages.map(lang => <Button key={lang} variant="outline" lang={lang} aria-pressed={sampleLanguage === lang}
            onClick={() => {
              player.current?.pause()
              setSampleLanguage(lang)
            }}>{copy.languageNames[lang]}</Button>)}
        </div>
        {sampleError && <p role="status">{c.sampleError}</p>}
        <div className="clip-sample-grid">{samples.filter(sample => sample.lang === sampleLanguage).map(sample =>
          <ClipSampleCard key={sample.id} copy={copy} sample={sample} busy={busy}
            activate={activatePlayer} check={() => void check(sample)} />)}</div>
      </section>
    </main>
  )
}

