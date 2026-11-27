import { afterEach, expect, it, vi } from 'vitest'
import { CLIP_CHUNK_SAMPLES, clipChunks, decodeVoiceClip, mixMono } from '../src/speech/clip-audio'

afterEach(() => vi.unstubAllGlobals())

it('mixes both channels without mutating them', () => {
  const stereo = [Float32Array.of(1, -0.5), Float32Array.of(0, 0.5)]
  expect(mixMono(stereo)).toEqual(Float32Array.of(0.5, 0))
  expect(stereo[0]).toEqual(Float32Array.of(1, -0.5))
})

it('decodes at 16 kHz and wipes the input and the decoded channels', async () => {
  const left = Float32Array.of(1, -1)
  const right = Float32Array.of(0, 1)
  const input = Uint8Array.of(8, 9)
  const decode = vi.fn().mockResolvedValue({
    numberOfChannels: 2, length: 2, duration: 0.01,
    getChannelData: (index: number) => index === 0 ? left : right,
  })
  const context = vi.fn(function () { return { decodeAudioData: decode } })
  vi.stubGlobal('OfflineAudioContext', context)
  expect(await decodeVoiceClip(input.buffer, new AbortController().signal)).toEqual(Float32Array.of(0.5, 0))
  expect(context).toHaveBeenCalledWith(1, 1, 16_000)
  expect(decode).toHaveBeenCalledWith(input.buffer)
  expect([left, right]).toEqual([new Float32Array(2), new Float32Array(2)])
  expect(input).toEqual(new Uint8Array(2))
})

it('wipes bytes even when decoding is cancelled', async () => {
  const input = Uint8Array.of(8, 9)
  await expect(decodeVoiceClip(input.buffer, AbortSignal.abort())).rejects.toThrow()
  expect(input).toEqual(new Uint8Array(2))
})

it('keeps every sample and yields a short final chunk', () => {
  const samples = new Float32Array(CLIP_CHUNK_SAMPLES * 2 + 3)
  samples[CLIP_CHUNK_SAMPLES] = 0.5
  const chunks = [...clipChunks(samples)]
  expect(chunks.map(chunk => chunk.length)).toEqual([CLIP_CHUNK_SAMPLES, CLIP_CHUNK_SAMPLES, 3])
  expect(chunks[1]?.[0]).toBe(0.5)
  expect([...clipChunks(new Float32Array(0))]).toEqual([])
})
