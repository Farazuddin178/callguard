import { expect, test } from '@playwright/test'
import en from '../../src/i18n/en.json' with { type: 'json' }
import hi from '../../src/i18n/hi.json' with { type: 'json' }
import te from '../../src/i18n/te.json' with { type: 'json' }

import { mockClipWorker } from './clip-fixture'

const clipIds = { en: 'en-arrest', hi: 'hi-sim', te: 'te-prize' } as const
test.use({ serviceWorkers: 'block' })

for (const [lang, { ui }] of Object.entries({ en, hi, te } as const)) {
  test(`capture the ${lang} landing and clip checker`, async ({ page }, info) => {
    test.setTimeout(120_000)
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8 })
      Object.defineProperty(navigator, 'deviceMemory', { value: 8 })
    })
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/')
    await page.getByRole('combobox', { name: en.ui.language }).selectOption(lang)
    await page.getByRole('button', { name: ui.tryIt.chips[0]![0] }).click()
    await page.getByText(ui.more.entries[0]![0]!, { exact: true }).click()
    await page.waitForFunction(() => document.fonts.ready)
    await page.evaluate(() => window.scrollTo(0, 0))
    await expect(page.locator('.hero-effect canvas')).toBeVisible()
    const directory = 'docs/evidence/img'
    await page.screenshot({ path: `${directory}/stage-4a-landing-${lang}-${info.project.name}.png`, fullPage: true })
    await page.getByRole('link', { name: ui.landing.clipLink }).click()
    await expect(page.getByRole('heading', { name: ui.clip.title })).toBeVisible()
    await expect(page.locator('.clip-sample')).toHaveCount(4)
    const sample = await mockClipWorker(page, clipIds[lang as keyof typeof clipIds])
    await page.getByRole('article', { name: sample.title }).getByRole('button', { name: ui.clip.check }).click()
    await expect(page.locator('.check-verdict')).toContainText(ui['scam-likely'])
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForFunction(() => document.fonts.ready)
    await page.screenshot({ path: `${directory}/stage-4a-clip-${lang}-${info.project.name}.png`, fullPage: true })
  })
}
