import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import en from '../../src/i18n/en.json' with { type: 'json' }
import hi from '../../src/i18n/hi.json' with { type: 'json' }
import te from '../../src/i18n/te.json' with { type: 'json' }

for (const [language, { ui }] of Object.entries({ en, hi, te })) {
  test(`the ${language} landing explains the app and shows usable examples`, async ({ page }) => {
    await page.goto('/')
    await page.getByRole('combobox', { name: en.ui.language }).selectOption(language)
    await expect(page.locator('html')).toHaveAttribute('lang', language)
    await expect(page.getByRole('heading', { name: ui.landing.headline })).toBeInViewport()
    await expect(page.getByRole('button', { name: ui.guard })).toBeInViewport({ ratio: 1 })
    await expect(page.getByRole('button', { name: ui.sample })).toBeInViewport({ ratio: 1 })
    await expect(page.getByRole('combobox', { name: ui.language })).toBeInViewport({ ratio: 1 })
    await expect(page.locator('.phone-preview')).toBeInViewport()
    for (const name of [ui.tryIt.title, ui.clip.title, ui.landing.works, ui.landing.tricks, ui.landing.privacyTitle,
      ui.landing.languages, ui.landing.danger, ui.more.faq, ui.more.facts]) {
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
    }
    await expect(page.locator('.guide-steps li')).toHaveCount(4)
    await expect(page.locator('.trick-grid article')).toHaveCount(10)
    for (const [index, [title, words]] of ui.tryIt.chips.entries()) {
      await page.getByRole('button', { name: title }).click()
      await expect(page.getByRole('textbox', { name: ui.tryIt.prompt })).toHaveValue(words!)
      const verdict = index < 3 ? ui.tryIt.scam : ui.tryIt.normal
      await expect(page.locator('.check-verdict')).toContainText(verdict)
    }
    await page.getByRole('button', { name: ui.tryIt.chips[0]![0] }).click()
    const trigger = page.locator('.highlighted-words mark a').first()
    await expect(trigger).toBeVisible()
    await trigger.click()
    await expect(page.locator('.reasons li:focus')).toBeVisible()
    await page.getByText(ui.more.entries[0]![0]!, { exact: true }).click()
    await expect(page.getByText(ui.more.entries[0]![1]!, { exact: true })).toBeVisible()
  })
}

test('the hero canvas pauses off-screen and unmounts before the demo', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8 })
    Object.defineProperty(navigator, 'deviceMemory', { value: 8 })
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const canvas = page.locator('.hero-effect canvas')
  await expect(canvas).toBeVisible()
  await expect.poll(() => canvas.evaluate(canvas => {
    if (!(canvas instanceof HTMLCanvasElement)) return false
    const pixels = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data
    return pixels?.some((channel, index) => index % 4 !== 3 && channel > 32) ?? false
  })).toBe(true)
  await page.getByRole('heading', { name: en.ui.more.facts }).scrollIntoViewIfNeeded()
  await expect(canvas).toHaveCount(0)
  await page.getByRole('heading', { name: en.ui.landing.headline }).scrollIntoViewIfNeeded()
  await expect(canvas).toBeVisible()
  await expect.poll(() => canvas.evaluate(canvas => {
    if (!(canvas instanceof HTMLCanvasElement)) return false
    const pixels = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data
    return pixels?.some((channel, index) => index % 4 !== 3 && channel > 32) ?? false
  })).toBe(true)
  await page.getByRole('button', { name: en.ui.sample }).click()
  await expect(canvas).toHaveCount(0)
  await expect(page.getByRole('heading', { name: en.ui.hangUp })).toBeVisible()
})

test('reduced motion leaves the hero on its static background', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: en.ui.landing.headline })).toBeVisible()
  await expect(page.locator('.hero-effect canvas')).toHaveCount(0)
})

for (const target of ['landing', 'voice clip', 'red alert']) {
  test(`${target} meets automated WCAG 2.1 AA checks`, async ({ page }) => {
    await page.goto(target === 'red alert' ? '/?speech=mock' : target === 'voice clip' ? '/#/check-clip' : '/')
    if (target === 'red alert') {
      await page.getByRole('button', { name: en.ui.guard }).click()
      await expect(page.getByRole('heading', { name: en.ui.hangUp })).toBeVisible()
    } else if (target === 'landing') {
      const selected = page.getByRole('button', { name: en.ui.tryIt.chips[0]![0] })
      await selected.click()
      await selected.hover()
      await expect(page.locator('.app-shell')).toHaveCSS('background-color', 'rgb(10, 16, 32)')
    } else {
      await expect(page.getByRole('heading', { name: en.ui.clip.title })).toBeVisible()
      await expect(page.locator('.app-shell')).toHaveCSS('background-color', 'rgb(10, 16, 32)')
      await expect(page.locator('.clip-sample')).toHaveCount(4)
    }
    const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
    expect(result.violations).toEqual([])
  })
}
