import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import en from '../../src/i18n/en.json' with { type: 'json' }
import hi from '../../src/i18n/hi.json' with { type: 'json' }
import te from '../../src/i18n/te.json' with { type: 'json' }
import { expectReadableText } from './visible-type'

for (const [language, { ui }] of Object.entries({ en, hi, te })) {
  test(`the ${language} guide turns all eight pages by buttons and keyboard and passes axe`, async ({ page }) => {
    await page.goto('/#/guide')
    await page.getByRole('combobox', { name: en.ui.language }).selectOption(language)
    await expect(page.getByRole('heading', { name: ui.guide.title })).toBeVisible()
    const caption = page.getByRole('heading', { level: 2 })
    const back = page.getByRole('button', { name: ui.guide.back, exact: true })
    const next = page.getByRole('button', { name: ui.guide.next, exact: true })
    await expect(back).toBeDisabled()
    expect((await next.boundingBox())?.height).toBeGreaterThanOrEqual(64)
    for (const step of ui.guide.steps) {
      await expect(caption).toHaveText(step)
      await expectReadableText(page.getByRole('main'))
      await next.click()
    }
    await expect(caption).toHaveText(ui.guide.done)
    await expect(next).toBeDisabled()
    for (const step of [...ui.guide.steps].reverse()) {
      await page.keyboard.press('ArrowLeft')
      await expect(caption).toHaveText(step)
    }
    await page.keyboard.press('ArrowRight')
    await expect(caption).toHaveText(ui.guide.steps[1]!)
    await back.click()
    await expect(caption).toHaveText(ui.guide.steps[0]!)
    const result = await new AxeBuilder({ page }).analyze()
    expect(result.violations).toEqual([])
  })

  test(`the ${language} mobile guide keeps every label whole and the controls together`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium', 'Uses the touch viewport')
    await page.goto('/#/guide')
    await page.getByRole('combobox', { name: en.ui.language }).selectOption(language)
    const main = page.getByRole('main')
    const next = main.getByRole('button', { name: ui.guide.next, exact: true })
    const back = main.getByRole('button', { name: ui.guide.back, exact: true })
    for (const step of ui.guide.steps) {
      await expect(main.getByRole('heading', { level: 2 })).toHaveText(step)
      await page.evaluate(() => document.fonts.ready.then(() => undefined))
      const violations = await main.locator('*').evaluateAll(elements => elements.flatMap(element => {
        if (!element.getClientRects().length) return []
        const style = getComputedStyle(element)
        const label = element.matches('button, label, select, .phone-control, .dial-label, .guide-app-icon, a[href]')
        if (style.wordBreak === 'break-all' || (label && style.overflowWrap === 'anywhere') ||
            (label && element.scrollWidth > element.clientWidth)) return [element.outerHTML.slice(0, 230)]
        return []
      }))
      expect(violations).toEqual([])
      await expect.poll(async () => Math.abs((await back.boundingBox())!.y - (await next.boundingBox())!.y)).toBeLessThan(1)
      const first = (await back.boundingBox())!
      const second = (await next.boundingBox())!
      const dots = (await main.locator('.guide-progress').boundingBox())!
      expect(second.x).toBeGreaterThanOrEqual(first.x + first.width)
      expect(dots.y + dots.height).toBeLessThan(first.y)
      expect(page.viewportSize()!.height - (second.y + second.height)).toBeLessThan(32)
      await next.click()
    }
  })
}

test('practice and the two installation guides are reachable', async ({ page }) => {
  const { ui } = en
  await page.goto('/#/guide')
  for (const step of ui.guide.steps) {
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(step)
    await page.keyboard.press('ArrowRight')
  }
  await page.getByRole('button', { name: ui.guide.install }).click()
  const caption = page.getByRole('heading', { level: 2 })
  for (const platform of ['android', 'iphone'] as const) {
    await page.getByRole('button', { name: ui.guide[platform] }).click()
    for (const step of ui.guide.installSteps[platform]) {
      await expect(caption).toHaveText(step)
      await page.keyboard.press('ArrowRight')
    }
  }
  await page.getByRole('button', { name: ui.guide.backToGuide }).click()
  await page.getByRole('link', { name: ui.guide.practice }).click()
  const demo = page.getByRole('region', { name: ui.demo })
  await expect(demo).toBeFocused()
  await expect(demo.getByRole('button', { name: ui.practice.answer })).toBeInViewport()
})

test('a horizontal touch swipe turns a picture page', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'mobile-chromium', 'Use the touch profile')
  await page.goto('/#/guide')
  const caption = page.getByRole('heading', { level: 2 })
  await expect(caption).toHaveText(en.ui.guide.steps[0]!)
  const art = page.locator('.picture-art')
  await art.scrollIntoViewIfNeeded()
  const box = (await art.boundingBox())!
  const y = Math.round(box.y + box.height / 2)
  const x = Math.round(box.x + box.width * .8)
  const touch = await context.newCDPSession(page)
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - 70, y }] })
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(caption).toHaveText(en.ui.guide.steps[1]!)
})

test('reading a guide step requires a tap and uses a local voice', async ({ page }) => {
  await page.addInitScript(() => {
    const remote = { lang: 'en-IN', localService: false }
    const local = { lang: 'en-GB', localService: true }
    class TestUtterance {
      constructor(readonly text: string) {}
    }
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: TestUtterance })
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        getVoices: () => [remote, local],
        cancel: () => {},
        speak: (step: SpeechSynthesisUtterance) => {
          document.documentElement.dataset.spokenStep = step.text
          document.documentElement.dataset.spokenVoice = step.voice?.lang
        },
      },
    })
  })
  await page.goto('/#/guide')
  const read = page.getByRole('button', { name: en.ui.guide.read })
  await expect(read).toBeVisible()
  await expect(page.locator('html')).not.toHaveAttribute('data-spoken-step', /.+/)
  await read.click()
  await expect(page.locator('html')).toHaveAttribute('data-spoken-step', en.ui.guide.steps[0]!)
  await expect(page.locator('html')).toHaveAttribute('data-spoken-voice', 'en-GB')
})

test('print mode hides the controls and lays out all eight steps on one A4 page', async ({ page }) => {
  await page.goto('/#/guide')
  await expect(page.getByRole('button', { name: en.ui.guide.print })).toBeVisible()
  await page.emulateMedia({ media: 'print' })
  await expect(page.locator('.topbar')).toBeHidden()
  await expect(page.locator('.picture-interactive')).toBeHidden()
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await expect(page.locator('.picture-print > li')).toHaveCount(8)
  await expect(page.locator('.picture-print > li').last()).toBeVisible()
  const printed = await page.pdf({ preferCSSPageSize: true, printBackground: true })
  expect(printed.toString('latin1').match(/\/Type\s*\/Page\b/g)).toHaveLength(1)
})
