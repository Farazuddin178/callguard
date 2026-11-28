import { expect, test } from '@playwright/test'
import { readFileSync, statSync } from 'node:fs'
import en from '../../src/i18n/en.json' with { type: 'json' }

test('the generated shell precache stays under 2 MB and excludes speech assets', () => {
  const dist = new URL('../../dist/', import.meta.url)
  const serviceWorker = readFileSync(new URL('sw.js', dist), 'utf8')
  const manifest = /\.precacheAndRoute\((\[[\s\S]*?\]),/.exec(serviceWorker)?.[1] ?? ''
  const files = Array.from(manifest.matchAll(/(?:\burl|["']url["']):\s*["']([^"']+)["']/g), match => match[1] ?? '')
  expect(files).toContain('index.html')
  expect(files.some(file => file.endsWith('.css'))).toBe(true)
  expect(files.some(file => file.endsWith('.woff2'))).toBe(true)
  for (const chunk of ['how-to-guide', 'scam-game']) {
    expect(files.some(file => file.startsWith(`assets/${chunk}-`) && file.endsWith('.js'))).toBe(true)
  }
  expect(files.filter(file => /\.wasm$|whisper\.worker|capture\.worklet|ort-wasm/.test(file))).toEqual([])
  expect(files.some(file => /hero-ribbon-.*\.webp$/.test(file))).toBe(true)
  expect(files.filter(file => /landing-arc|phone-tilt|hero-field|threeui|predictivearc|neuform|halftone|ribbonfield|datapixelarc|^samples\//i.test(file))).toEqual([])
  const total = files.reduce((sum, file) => sum + statSync(new URL(file, dist)).size, 0)
  expect(total).toBeLessThan(2_000_000)
})

test('the app shell loads offline after the service worker activates', async ({ page, context }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('CallGuard')
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.webmanifest$/)
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)

  await context.setOffline(true)
  await page.reload()
  await expect(page).toHaveTitle('CallGuard')
  await expect(page.getByRole('button', { name: en.ui.practice.realCall })).toBeVisible()
  await page.getByRole('link', { name: en.ui.guide.title }).first().click()
  await expect(page.getByRole('heading', { name: en.ui.guide.steps[0] })).toBeVisible()
})

test('the served PWA manifest has the install metadata and three usable icons', async ({ page }) => {
  await page.goto('/')
  const href = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(href).toBeTruthy()
  const response = await page.request.get(href!)
  expect(response.ok()).toBe(true)
  const manifest: unknown = await response.json()
  expect(manifest).toMatchObject({
    name: 'CallGuard',
    short_name: 'CallGuard',
    theme_color: expect.stringMatching(/^#[0-9a-f]{6}$/i),
    start_url: '/',
    icons: expect.arrayContaining([
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ]),
  })
  for (const [src, size] of [
    ['/icon-192.png', 192], ['/icon-512.png', 512], ['/icon-maskable-512.png', 512],
  ] as const) {
    const dimensions = await page.evaluate(async url => {
      const icon = new Image()
      icon.src = url
      await icon.decode()
      return [icon.naturalWidth, icon.naturalHeight]
    }, src)
    expect(dimensions).toEqual([size, size])
  }
})
