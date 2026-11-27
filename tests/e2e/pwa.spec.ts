import { expect, test } from '@playwright/test'
import { readFileSync, statSync } from 'node:fs'
import en from '../../src/i18n/en.json' with { type: 'json' }

test('the generated shell precache stays under 2 MB and excludes speech assets', () => {
  const dist = new URL('../../dist/', import.meta.url)
  const serviceWorker = readFileSync(new URL('sw.js', dist), 'utf8')
  const manifest = /\.precacheAndRoute\((\[[\s\S]*?\]),/.exec(serviceWorker)?.[1] ?? ''
  const files = Array.from(manifest.matchAll(/\burl:\s*["']([^"']+)["']/g), match => match[1] ?? '')
  expect(files).toContain('index.html')
  expect(files.some(file => file.endsWith('.css'))).toBe(true)
  expect(files.some(file => file.endsWith('.woff2'))).toBe(true)
  expect(files.filter(file => /\.wasm$|whisper\.worker|capture\.worklet|ort-wasm/.test(file))).toEqual([])
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
  await expect(page.getByRole('button', { name: en.ui.guard })).toBeVisible()
})
