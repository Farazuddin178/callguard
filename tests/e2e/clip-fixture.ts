import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'

type Sample = { id: string; title: string; dialogue: string[] }
const manifest = JSON.parse(readFileSync(new URL('../../public/samples/manifest.json', import.meta.url), 'utf8')) as Sample[]

export async function mockClipWorker(page: Page, id: string) {
  const sample = manifest.find(clip => clip.id === id)
  if (!sample) throw new Error(`Missing clip fixture ${id}`)
  await page.route(/\/assets\/whisper\.worker-[\w-]+\.js$/, route => route.fulfill({
    contentType: 'text/javascript',
    body: `
      const dialogue = ${JSON.stringify(sample.dialogue)};
      let chunk = 0;
      const metrics = { backend: 'wasm', loadMs: 1 };
      self.onmessage = ({data}) => {
        if (data.type === 'load') self.postMessage({ type: 'ready', metrics });
        else if (data.samples.length > 0) {
          const words = chunk === 0 ? dialogue[0] : chunk === 1 ? dialogue.slice(1).join(' ') : '';
          chunk++;
          self.postMessage({ type: 'result', text: words, metrics });
        }
      };
    `,
  }))
  await page.route(/\/assets\/(?:ort-wasm|capture\.worklet)/, route => route.fulfill({ body: '' }))
  return sample
}
