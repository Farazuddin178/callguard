import { LogitsProcessor, LogitsProcessorList, type AutomaticSpeechRecognitionPipeline, type PreTrainedTokenizer, type Tensor } from '@huggingface/transformers'
import type { SpeechLanguage } from './types'
import { whisperOptions } from './whisper-protocol.ts'

const arabicRanges = '\\u0600-\\u06ff\\u0750-\\u077f\\ufb50-\\ufdff\\ufe70-\\ufeff'
const arabic = new RegExp(`[${arabicRanges}]`, 'u')
const excludedFromTelugu = /[\u0900-\u097f]|[\u0b80-\u0bff]|[\u0c80-\u0cff]|[\ua8e0-\ua8ff]|[\u{11b00}-\u{11b5f}]/u
const utf8 = new TextDecoder()

export function hasExcludedScript(text: string, language: SpeechLanguage) {
  return language !== 'en' && (arabic.test(text) || (language === 'te' && excludedFromTelugu.test(text)))
}

class ScriptMask extends LogitsProcessor {
  private readonly blocked: number[] = []
  private readonly bytes: (Uint8Array | undefined)[] = []
  private readonly continuations: number[] = []
  private readonly splitMasks = new Map<string, number[]>()

  private readonly language: 'hi' | 'te'

  constructor(tokenizer: PreTrainedTokenizer, language: 'hi' | 'te') {
    super()
    this.language = language
    const special = new Set(tokenizer.all_special_ids)
    const decoder = tokenizer.decoder as typeof tokenizer.decoder & { byte_decoder?: Record<string, number> }
    tokenizer.model.vocab.forEach((token, id) => {
      if (special.has(id)) return
      if (hasExcludedScript(tokenizer.decode([id]), language)) this.blocked.push(id)
      if (!decoder.byte_decoder) return
      const bytes = Uint8Array.from(token, char => decoder.byte_decoder![char]!)
      this.bytes[id] = bytes
      const first = bytes[0]
      if (first !== undefined && first >= 0x80 && first < 0xc0) this.continuations.push(id)
    })
  }

  private splitMask(ids: bigint[]) {
    // Whisper's byte-level tokenizer can split a Unicode character across up to four tokens.
    const suffix: number[] = []
    for (let i = ids.length - 1; i >= 0 && suffix.length < 3; i--) {
      const bytes = this.bytes[Number(ids[i])]
      if (!bytes?.length) break
      suffix.unshift(...bytes.slice(-3))
    }
    let start = suffix.length - 1
    while (start >= 0 && suffix[start]! >= 0x80 && suffix[start]! < 0xc2) start--
    if (start < 0) return []
    const prefix = suffix.slice(start)
    const first = prefix[0]!
    const width = first < 0xc2 ? 1 : first < 0xe0 ? 2 : first < 0xf0 ? 3 : 4
    if (prefix.length >= width) return []
    const key = prefix.join(',')
    let mask = this.splitMasks.get(key)
    if (!mask) {
      mask = this.continuations.filter(id => {
        const bytes = this.bytes[id]!
        const partial = Uint8Array.from([...prefix, ...bytes.slice(0, width - prefix.length)])
        return hasExcludedScript(utf8.decode(partial), this.language)
      })
      this.splitMasks.set(key, mask)
    }
    return mask
  }

  override _call(inputIds: bigint[][], logits: Tensor) {
    const width = logits.dims.at(-1)!
    const data = logits.data
    for (const [row, ids] of inputIds.entries()) {
      const start = row * width
      for (const id of this.blocked) data[start + id] = -Infinity
      for (const id of this.splitMask(ids)) data[start + id] = -Infinity
    }
    return logits
  }
}

const masks = new WeakMap<PreTrainedTokenizer, Partial<Record<'hi' | 'te', ScriptMask>>>()

export function whisperScriptProcessors(tokenizer: PreTrainedTokenizer, language: SpeechLanguage) {
  if (language === 'en') return undefined
  let modelMasks = masks.get(tokenizer)
  if (!modelMasks) {
    modelMasks = {}
    masks.set(tokenizer, modelMasks)
  }
  modelMasks[language] ??= new ScriptMask(tokenizer, language)
  // Transformers.js 3.8.1 does not apply generation_config.suppress_tokens.
  // Each generation needs its own list because Whisper appends its built-in processors.
  const processors = new LogitsProcessorList()
  processors.push(modelMasks[language])
  return processors
}

export async function transcribeWhisperChunk(transcriber: AutomaticSpeechRecognitionPipeline,
  samples: Float32Array, language: SpeechLanguage, constrainScript = true,
) {
  const options = {
    ...whisperOptions(language, samples.length),
    logits_processor: constrainScript ? whisperScriptProcessors(transcriber.tokenizer, language) : undefined,
  }
  try {
    const result = await transcriber(samples, options)
    const output = Array.isArray(result) ? result[0] : result
    return output?.text.trim() ?? ''
  } catch (error) {
    // Whisper can predict only end-of-text on a short or silent chunk.
    // Transformers.js 3.8.1 throws while decoding that empty token sequence.
    if (error instanceof Error && error.message === 'token_ids must be a non-empty array of integers.') return ''
    throw error
  }
}
