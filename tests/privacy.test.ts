import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { expect, it } from 'vitest'

const sourceDirectory = fileURLToPath(new URL('../src/', import.meta.url))
const network = ['fetch', 'XMLHttpRequest', 'WebSocket', 'sendBeacon', 'EventSource', 'RTCPeerConnection']
const persistence = ['indexedDB', 'sessionStorage', 'console', 'showSaveFilePicker']
const browserSpeech = ['SpeechRecognition', 'webkitSpeechRecognition', 'MediaRecorder']

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(file => {
    const path = join(directory, file.name)
    if (file.isDirectory()) return sourceFiles(path)
    return /\.[cm]?[jt]sx?$/.test(file.name) ? [path] : []
  })
}

it('keeps call data away from direct network, storage and logging APIs', () => {
  const violations: string[] = []
  for (const path of sourceFiles(sourceDirectory)) {
    const name = relative(sourceDirectory, path)
    const input = readFileSync(path, 'utf8')
    let safeInput = name === join('speech', 'whisper.worker.ts')
      ? input.replace(/Object\.assign\(self\.console, \{\s+debug: discardDiagnostic,\s+error: discardDiagnostic,\s+info: discardDiagnostic,\s+log: discardDiagnostic,\s+warn: discardDiagnostic,\s+\}\)/, '')
      : input
    if (name === join('speech', 'speech-assets.ts')) {
      // Allow the single same-origin, credential-free GET for build-time speech asset URLs.
      safeInput = safeInput.replace("fetch(url, { signal, credentials: 'omit', mode: 'same-origin', redirect: 'error' })", 'speechAssetDownload')
    }
    const source = ts.createSourceFile(path, safeInput, ts.ScriptTarget.Latest, true)
    // Transformers.js handles model weight downloads inside the speech worker.
    const forbidden = new Set([...network, ...persistence, ...browserSpeech])
    if (name !== 'settings.ts') forbidden.add('localStorage')
    function visit(node: ts.Node) {
      if ((ts.isIdentifier(node) || ts.isStringLiteralLike(node)) && forbidden.has(node.text)) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart(source))
        violations.push(`${name}:${line + 1} ${node.text}`)
      }
      ts.forEachChild(node, visit)
    }
    visit(source)
  }
  expect(violations).toEqual([])
})

it('drops library diagnostics in the speech worker', () => {
  const worker = readFileSync(join(sourceDirectory, 'speech', 'whisper.worker.ts'), 'utf8')
  expect(worker).toContain('const discardDiagnostic = () => {}')
  expect(worker).toMatch(/Object\.assign\(self\.console, \{[\s\S]*?error: discardDiagnostic,/)
})

it('persists only the four explicitly allowed preferences', () => {
  const settings = readFileSync(join(sourceDirectory, 'settings.ts'), 'utf8')
  expect(settings.match(/\blocalStorage\b/g)).toHaveLength(2)
  expect(settings).toMatch(
    /localStorage\.setItem\(key, JSON\.stringify\(\{ language, modelSize, familyAlert, familyNumber \}\)\)/,
  )
})
