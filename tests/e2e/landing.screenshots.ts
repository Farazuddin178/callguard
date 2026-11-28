import { expect, test, type Page } from '@playwright/test'
import en from '../../src/i18n/en.json' with { type: 'json' }
import hi from '../../src/i18n/hi.json' with { type: 'json' }
import te from '../../src/i18n/te.json' with { type: 'json' }

import { mockClipWorker } from './clip-fixture'
import { saveScreenshot } from './screenshot-file'

const clipIds = { en: 'en-arrest', hi: 'hi-sim', te: 'te-prize' } as const
test.use({ serviceWorkers: 'block' })
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8 })
    Object.defineProperty(navigator, 'deviceMemory', { value: 8 })
  })
})

async function openLanding(page: Page, language: string) {
  await page.goto('/')
  await page.getByRole('combobox', { name: en.ui.language }).selectOption(language)
  await expect(page.locator('html')).toHaveAttribute('lang', language)
}

async function prepareHeroCapture(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0))
  const stage = page.locator('.phone-stage')
  await expect(stage.locator('.handset')).toBeVisible()
  // The still frame also covers a failed or disabled WebGL renderer.
  await stage.locator('.hero-contours[data-tint="neutral"]').evaluate(async field => {
    const mask = getComputedStyle(field, '::after').maskImage
    const source = /^url\("(.*)"\)$/.exec(mask)?.[1]
    if (!source) throw new Error('Hero fallback image is missing')
    const still = new Image()
    still.src = source
    await Promise.all([still.decode(), document.fonts.ready])
  })
  if (await stage.getAttribute('data-awake') === 'true') {
    await stage.locator('canvas').waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {
      // The decoded still frame remains visible while the optional renderer loads.
    })
  }
}

for (const [lang, { ui }] of Object.entries({ en, hi, te } as const)) {
  test(`capture the ${lang} full landing`, async ({ page }, info) => {
    // Full-page captures use the still field. The viewport tests exercise the live renderer.
    await page.addInitScript(() => {
      const connection = new EventTarget()
      Object.defineProperty(connection, 'saveData', { value: true })
      Object.defineProperty(navigator, 'connection', { value: connection })
    })
    await openLanding(page, lang)
    await page.getByRole('button', { name: ui.tryIt.chips[0]![0] }).click()
    await page.getByText(ui.more.entries[0]![0]!, { exact: true }).click()
    await prepareHeroCapture(page)
    await saveScreenshot(page, `stage-5-review-landing-${lang}-${info.project.name}.png`)
  })

  test(`capture the ${lang} first viewport`, async ({ page }, info) => {
    const mobile = info.project.name === 'mobile-chromium'
    test.skip(!mobile && info.project.name !== 'chromium-1440', 'Dedicated mobile and wide desktop captures')
    await openLanding(page, lang)
    await prepareHeroCapture(page)
    if (mobile) {
      expect(page.viewportSize()).toEqual({ width: 412, height: 915 })
      await expect(page.getByRole('heading', { name: ui.landing.headline })).toBeInViewport({ ratio: 1 })
      await expect(page.getByRole('button', { name: ui.sample })).toBeInViewport({ ratio: 1 })
      await expect(page.getByRole('button', { name: ui.practice.realCall })).toBeInViewport({ ratio: 1 })
      await expect(page.getByRole('combobox', { name: ui.language })).toBeInViewport({ ratio: 1 })
    } else {
      const phone = page.locator('.hero-demo .handset')
      expect((await phone.boundingBox())!.height).toBeGreaterThanOrEqual(560)
    }
    await saveScreenshot(page, `stage-5-review-hero-${lang}-${info.project.name}.png`, false)
  })

  test(`capture the ${lang} clip checker`, async ({ page }, info) => {
    await openLanding(page, lang)
    const sample = await mockClipWorker(page, clipIds[lang as keyof typeof clipIds])
    await page.goto('/#/check-clip')
    await expect(page.getByRole('heading', { name: ui.clip.title })).toBeVisible()
    await expect(page.locator('.clip-sample')).toHaveCount(4)
    await page.getByRole('article', { name: sample.title }).getByRole('button', { name: ui.clip.check }).click()
    await expect(page.locator('.check-verdict')).toContainText(ui['scam-likely'])
    await page.evaluate(() => window.scrollTo(0, 0))
    await saveScreenshot(page, `stage-5-review-clip-${lang}-${info.project.name}.png`)
  })
}

test('capture the speaker and warning pictures in the guide', async ({ page }, info) => {
  await page.goto('/#/guide')
  const next = page.getByRole('button', { name: en.ui.guide.next, exact: true })
  for (let index = 0; index <= 6; index++) {
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(en.ui.guide.steps[index]!)
    if (index === 1 || index === 6) {
      await page.evaluate(() => window.scrollTo(0, 0))
      await saveScreenshot(page, `stage-5-review-guide-${index + 1}-en-${info.project.name}.png`, info.project.name !== 'mobile-chromium')
    }
    if (index < 6) await next.click()
  }
})
