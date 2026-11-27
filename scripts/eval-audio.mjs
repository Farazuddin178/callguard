import { spawnSync } from 'node:child_process'
import { readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { availableParallelism } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import { env, pipeline } from '@huggingface/transformers'
import { detectClipLanguage } from '../src/speech/whisper-language.ts'
import { hasExcludedScript, transcribeWhisperChunk } from '../src/speech/whisper-script.ts'
import { scoreClip } from '../src/detect/clip-score.ts'
import { clipChunks, MAX_CLIP_SECONDS } from '../src/speech/clip-audio.ts'
import { AUDIO_SAMPLE_RATE, WHISPER_MODEL_HOST, whisperModelId } from '../src/speech/whisper-protocol.ts'

const { values, positionals } = parseArgs({
  options: {
    model: { type: 'string' },
    'model-path': { type: 'string' },
    language: { type: 'string' },
    unconstrained: { type: 'boolean' },
    output: { type: 'string' },
  },
  allowPositionals: true,
})
if ((values.model && !['base', 'small'].includes(values.model)) || (values.model && values['model-path'])
  || (values.language && !['en', 'hi', 'te'].includes(values.language))
  || positionals.length > 1 || (positionals.length && (values.output || values.language))) {
  process.stderr.write('Usage: eval:audio [--model base|small | --model-path dir] [--unconstrained] [--language en|hi|te] [--output synthetic-report.md | private-folder]\n')
  process.exit(1)
}

const bundled = fileURLToPath(new URL('../public/samples/', import.meta.url))
const privateFolder = positionals[0] ? resolve(positionals[0]) : undefined
const media = /\.(?:mp3|m4a|wav|ogg|webm|flac|aac|opus|mp4|aiff?|amr|wma)$/i
const verdictNames = { 'scam-likely': 'Scam likely', careful: 'Be careful', safe: 'Looks genuine' }

async function listClips() {
  if (!privateFolder) {
    return JSON.parse(await readFile(join(bundled, 'manifest.json'), 'utf8'))
      .map(({ id, lang, label }) => ({ file: join(bundled, id + '.mp3'), lang, label }))
      .filter(clip => !values.language || clip.lang === values.language)
  }
  const files = await readdir(privateFolder, { withFileTypes: true })
  return files.filter(entry => entry.isFile() && media.test(entry.name)).map(({ name }) => {
    const tokens = name.replace(media, '').toLowerCase().split(/[\s_.-]+/)
    const lang = tokens.find(token => ['en', 'hi', 'te'].includes(token)) ?? 'auto'
    const label = tokens.find(token => ['scam', 'genuine'].includes(token))
    return { file: join(privateFolder, name), lang, label }
  }).sort((a, b) => a.file.localeCompare(b.file))
}

function decode(file) {
  const result = spawnSync(process.env.CALLGUARD_FFMPEG || 'ffmpeg', [
    '-nostdin', '-hide_banner', '-loglevel', 'error', '-protocol_whitelist', 'file,pipe', '-i', file,
    '-t', String(MAX_CLIP_SECONDS + 1), '-vn', '-ac', '1', '-ar', String(AUDIO_SAMPLE_RATE), '-f', 'f32le', 'pipe:1',
  ], { maxBuffer: (MAX_CLIP_SECONDS + 2) * AUDIO_SAMPLE_RATE * 4, windowsHide: true })
  const pcm = result.stdout
  try {
    if (result.error) throw result.error
    if (result.status !== 0 || !pcm?.length || pcm.length > MAX_CLIP_SECONDS * AUDIO_SAMPLE_RATE * 4) {
      throw new Error('FFmpeg could not decode the clip or it exceeded the time limit')
    }
    const samples = new Float32Array(pcm.length / 4)
    for (let index = 0; index < samples.length; index++) samples[index] = pcm.readFloatLE(index * 4)
    return samples
  } finally {
    pcm?.fill(0)
    result.stderr?.fill(0)
  }
}

function cell(value) {
  return String(value).replace(/\p{Bidi_Control}/gu, '').replace(/\s+/g, ' ').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('|', '\\|')
}

const clips = await listClips().catch(() => [])
if (!clips.length) {
  process.stderr.write('No supported audio files found.\n')
  process.exit(1)
}

const localPath = values['model-path'] ? resolve(values['model-path']) : undefined
if (localPath && !(await stat(localPath).catch(() => undefined))?.isDirectory()) {
  process.stderr.write('The local ONNX model directory is unavailable.\n')
  process.exit(1)
}
env.remoteHost = WHISPER_MODEL_HOST
env.allowLocalModels = !!localPath
env.allowRemoteModels = !localPath
env.cacheDir = fileURLToPath(new URL('../node_modules/.cache/callguard-whisper/', import.meta.url))
if (localPath) env.localModelPath = dirname(localPath)
const model = localPath ? basename(localPath) : whisperModelId(values.model ?? 'base')
const rows = []
const diagnostics = Object.fromEntries(['debug', 'error', 'info', 'log', 'warn'].map(key => [key, console[key]]))
let modelLoad
let transcriber
try {
  // ONNX diagnostics may include audio tensors.
  Object.assign(console, Object.fromEntries(Object.keys(diagnostics).map(key => [key, () => {}])))
  for (const clip of clips) {
    let samples
    let transcript = ''
    let language = clip.lang
    let result
    let failure
    let transcriptionMs = 0
    try {
      samples = decode(clip.file)
      modelLoad ??= pipeline('automatic-speech-recognition', model, {
        device: 'cpu', dtype: 'q8',
        session_options: { intraOpNumThreads: Math.min(4, availableParallelism()), interOpNumThreads: 1 },
      })
      transcriber = await modelLoad
      const started = performance.now()
      for (const chunk of clipChunks(samples)) {
        if (language === 'auto') language = await detectClipLanguage(transcriber, chunk)
        const value = await transcribeWhisperChunk(transcriber, chunk, language, !values.unconstrained)
        if (value) transcript = transcript ? `${transcript} ${value}` : value
        chunk.fill(0)
      }
      transcriptionMs = performance.now() - started
      if (transcript) result = scoreClip(transcript)
      else failure = 'No clear words'
    } catch (error) {
      failure = typeof error?.code === 'string' && /^[A-Z_]+$/.test(error.code) ? error.code : 'Decode or inference error'
    } finally {
      samples?.fill(0)
    }
    const evaluated = !!result || failure === 'No clear words'
    const correct = !clip.label ? undefined :
      (clip.label === 'scam' ? result?.level === 'scam-likely' : result?.level === 'safe')
    rows.push({
      ...(privateFolder ? {} : { file: basename(clip.file), excerpt: transcript.slice(0, 180) || '—' }),
      lang: language, label: clip.label, score: result?.score, verdict: result ? verdictNames[result.level] : failure,
      correct, evaluated, transcriptionMs,
      excluded: language !== 'en' && language !== 'auto' && transcript ? hasExcludedScript(transcript, language) : undefined,
    })
    if (!privateFolder) process.stderr.write(`${basename(clip.file)}: ${rows.at(-1).verdict}\n`)
  }
} finally {
  try {
    await transcriber?.dispose()
  } finally {
    Object.assign(console, diagnostics)
  }
}

function aggregate(lang) {
  const group = rows.filter(row => !lang || row.lang === lang)
  const labelled = group.filter(row => row.correct !== undefined)
  const scams = labelled.filter(row => row.label === 'scam')
  const scripts = group.filter(row => row.excluded !== undefined)
  const times = group.filter(row => row.transcriptionMs > 0)
  const fraction = (count, total) => total ? `${count}/${total}` : '—'
  return [lang ?? 'Overall', fraction(group.filter(row => row.evaluated).length, group.length),
    fraction(labelled.filter(row => row.correct).length, labelled.length),
    fraction(scams.filter(row => row.correct).length, scams.length),
    fraction(scripts.filter(row => row.excluded).length, scripts.length),
    times.length ? (times.reduce((sum, row) => sum + row.transcriptionMs, 0) / times.length / 1000).toFixed(1) : '—']
}

const tableRow = values => '| ' + values.map(cell).join(' | ') + ' |'
const report = [
  `## ${model} · ${values.unconstrained ? 'Unconstrained' : 'Script-constrained'}`,
  '',
  'CPU q8, 16 kHz mono, shared browser chunking and scoring. A Careful result counts as a miss for either expected label.',
  '',
  '| Language | Evaluated | Correct | Scams caught | Excluded script present | Mean inference seconds |',
  '| --- | ---: | ---: | ---: | ---: | ---: |',
  ...['en', 'hi', 'te', 'auto'].filter(lang => rows.some(row => row.lang === lang)).map(lang => tableRow(aggregate(lang))),
  tableRow(aggregate()),
  '',
  ...(privateFolder ? [] : [
    '| File | Language | Expected | Transcript excerpt | Score | Verdict | Correct | Excluded script |',
    '| --- | --- | --- | --- | ---: | --- | --- | --- |',
    ...rows.map(row => tableRow([row.file, row.lang, row.label ?? 'Unknown', row.excerpt, row.score ?? '—', row.verdict,
      row.correct === undefined ? '—' : row.correct ? 'Yes' : 'No', row.excluded === undefined ? '—' : row.excluded ? 'Yes' : 'No'])),
    '',
  ]),
].join('\n')

process.stdout.write(report)
if (values.output) await writeFile(resolve(values.output), report)
if (rows.every(row => !row.evaluated)) process.exitCode = 1

