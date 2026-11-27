import { Tensor, type AutomaticSpeechRecognitionPipeline, type PreTrainedTokenizer } from '@huggingface/transformers'
import { expect, it } from 'vitest'
import { configuredTeluguModel, isSameOriginWhisper, whisperWeightBase } from '../src/speech/whisper-protocol'
import { hasExcludedScript, transcribeWhisperChunk, whisperScriptProcessors } from '../src/speech/whisper-script'

it('resolves opt-in Telugu model IDs only on Hugging Face or under the local model directory', () => {
  const local = configuredTeluguModel(' /models/callguard-telugu-q8 ')
  const remote = configuredTeluguModel('owner/callguard-telugu-q8')
  expect(local).toBe('/models/callguard-telugu-q8')
  expect(remote).toBe('owner/callguard-telugu-q8')
  expect(isSameOriginWhisper(local!)).toBe(true)
  expect(whisperWeightBase(local!)).toBe('/models/callguard-telugu-q8/')
  expect(isSameOriginWhisper(remote!)).toBe(false)
  expect(whisperWeightBase(remote!)).toBe('https://huggingface.co/owner/callguard-telugu-q8/resolve/main/')
  for (const id of [undefined, 'https://elsewhere.example/model', '/models/../file', '//elsewhere.example/model']) {
    expect(configuredTeluguModel(id)).toBeUndefined()
  }
})

it('excludes competing writing systems while keeping the requested scripts and Latin text', () => {
  expect(hasExcludedScript('اب ﷲ ﺍ', 'hi')).toBe(true)
  expect(hasExcludedScript('नमस्ते OTP', 'hi')).toBe(false)
  for (const sample of ['తెలుగు', 'OTP']) expect(hasExcludedScript(sample, 'te')).toBe(false)
  for (const sample of ['العربية', 'தமிழ்', 'नमस्ते', 'ಕನ್ನಡ']) {
    expect(hasExcludedScript(sample, 'te')).toBe(true)
  }
})

it('continues past a chunk where Whisper produces an empty token sequence', async () => {
  const transcriber = (async () => {
    throw new Error('token_ids must be a non-empty array of integers.')
  }) as unknown as AutomaticSpeechRecognitionPipeline
  await expect(transcribeWhisperChunk(transcriber, new Float32Array(16_000), 'en')).resolves.toBe('')
})

it('masks both complete tokens and Arabic characters split across byte-level tokens', () => {
  const decoded = ['Hi', 'ا', '�', '�', '�']
  const tokenizer = {
    all_special_ids: [],
    model: { vocab: ['H', 'XY', 'X', 'Y', 'Z'] },
    decoder: { byte_decoder: { H: 0x48, X: 0xd8, Y: 0xa7, Z: 0x80 } },
    decode: ([id]: number[]) => decoded[id!],
  } as unknown as PreTrainedTokenizer

  const processor = whisperScriptProcessors(tokenizer, 'hi')!
  const scores = new Float32Array(10)
  const logits = new Tensor('float32', scores, [2, 5])
  expect(processor([[0n], [2n]], logits)).toBe(logits)
  expect([...scores]).toEqual([0, -Infinity, 0, 0, 0, 0, -Infinity, 0, -Infinity, -Infinity])
  expect(whisperScriptProcessors(tokenizer, 'en')).toBeUndefined()
})
