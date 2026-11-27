import { Tensor, type AutomaticSpeechRecognitionPipeline } from '@huggingface/transformers'
import type { SpeechLanguage } from './types'

const supported: SpeechLanguage[] = ['en', 'hi', 'te']

export async function detectClipLanguage(transcriber: AutomaticSpeechRecognitionPipeline, audio: Float32Array): Promise<SpeechLanguage> {
  // Transformers.js 3.8 defaults an unspecified language to English.
  // Whisper predicts the language in its first decoder step.
  const [start, ...ids] = transcriber.tokenizer.model.convert_tokens_to_ids([
    '<|startoftranscript|>', ...supported.map(language => `<|${language}|>`),
  ])
  const { input_features } = await transcriber.processor(audio) as { input_features: Tensor }
  const prompt = new Tensor('int64', [BigInt(start!)], [1, 1])
  const { logits } = await transcriber.model.forward({ input_features, decoder_input_ids: prompt }) as { logits: Tensor }
  const scores = logits.data
  const best = ids.reduce((top, id, index) => Number(scores[id]) > Number(scores[ids[top]!]) ? index : top, 0)
  return supported[best]!
}
