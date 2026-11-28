import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import en from '../../src/i18n/en.json' with { type: 'json' }
import hi from '../../src/i18n/hi.json' with { type: 'json' }
import te from '../../src/i18n/te.json' with { type: 'json' }
import { expectReadableText } from './visible-type'

for (const [language, { ui }] of Object.entries({ en, hi, te })) {
  test(`the ${language} landing explains the app and shows usable examples`, async ({ page }, info) => {
    await page.goto('/')
    await page.getByRole('combobox', { name: en.ui.language }).selectOption(language)
    await expect(page.locator('html')).toHaveAttribute('lang', language)
    await expect(page.getByRole('heading', { name: ui.landing.headline })).toBeInViewport()
    await expect(page.getByRole('button', { name: ui.practice.realCall })).toBeInViewport({ ratio: 1 })
    await expect(page.getByRole('button', { name: ui.sample })).toBeInViewport({ ratio: 1 })
    await expect(page.getByRole('combobox', { name: ui.language })).toBeInViewport({ ratio: 1 })
    await expect(page.getByRole('banner').getByRole('combobox', { name: ui.language })).toHaveCount(1)
    await expect(page.getByRole('link', { name: ui.guide.title }).first()).toBeInViewport({ ratio: 1 })
    await expect(page.getByRole('banner').getByRole('button', { name: ui.landing.read })).toBeVisible()
    await expect(page.getByRole('banner').getByRole('button', { name: ui.settings })).toBeVisible()
    await expect(page.locator('.hero-demo .handset')).toBeInViewport()
    if (info.project.name === 'mobile-chromium') {
      expect((await page.locator('.hero-demo .handset').boundingBox())!.width).toBeGreaterThanOrEqual(page.viewportSize()!.width * .7)
    }
    for (const name of [ui.tryIt.title, ui.clip.title, ui.landing.works, ui.landing.tricks, ui.landing.privacyTitle,
      ui.landing.languages, ui.landing.danger, ui.more.faq, ui.more.facts, ui.guide.title]) {
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible()
    }
    await expect(page.locator('.story-steps li')).toHaveCount(4)

    const game = page.getByRole('region', { name: ui.landing.tricks })
    const answers = [true, false, true, true, true, true, false, true, true, true, true, true]
    const examples = ui.landing.tactics.map(([, words]) => words)
    examples.splice(5, 0, ui.tryIt.chips[4]![1]!)
    examples.splice(1, 0, ui.tryIt.chips[3]![1]!)
    for (const [index, scam] of answers.entries()) {
      const progress = ui.game.progress.replace('{step}', String(index + 1)).replace('{total}', '12')
      await expect(game.getByText(progress, { exact: true })).toBeVisible()
      await expect(game.locator('blockquote')).toContainText(examples[index]!)
      await game.getByRole('button', { name: scam ? ui.game.scam : ui.safe, exact: true }).click()
      await expect(game.getByRole('status')).toContainText(ui.game.correct)
      await game.getByRole('button', { name: ui.guide.next }).click()
    }
    await expect(game.getByRole('status')).toHaveText(ui.landing.real)
    await expect(game.getByText(ui.game.score.replace('{score}', '12').replace('{total}', '12'))).toBeVisible()

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
    await expectReadableText(page.locator('.landing'))
  })
}

test('the handset tilts under the pointer, resets off-screen and unmounts when guarding', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile-chromium', 'Pointer tilt uses a fine pointer')
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8 })
    Object.defineProperty(navigator, 'deviceMemory', { value: 8 })
    Object.defineProperty(navigator, 'connection', { value: { saveData: false, addEventListener() {}, removeEventListener() {} } })
  })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/?speech=mock')
  const stage = page.locator('.phone-stage')
  const object = page.locator('.phone-object')
  await expect(stage).toBeVisible()
  await expect(stage.locator('canvas')).toBeVisible()
  await expect(stage).toHaveAttribute('data-awake', 'true')
  await expect(object).toHaveAttribute('data-ringing', 'true')
  await expect(object.locator('.handset')).toHaveCSS('animation-name', 'ringing-buzz')
  await expect(object.getByRole('button', { name: en.ui.practice.decline })).toBeVisible()
  await expect.poll(async () => {
    await stage.hover({ position: { x: 60, y: 60 } })
    const tilt = await object.evaluate(node => (node as HTMLElement).style.getPropertyValue('--tilt-x'))
    return Math.abs(Number.parseFloat(tilt))
  }).toBeGreaterThan(1)
  await page.getByRole('heading', { name: en.ui.more.facts }).scrollIntoViewIfNeeded()
  await expect(stage.locator('canvas')).toHaveCount(0)
  await expect.poll(() => object.evaluate(node => (node as HTMLElement).style.getPropertyValue('--tilt-x'))).toBe('0deg')
  await page.getByRole('button', { name: en.ui.practice.realCall }).click()
  await page.getByRole('dialog', { name: en.ui.practice.realCall }).getByRole('button', { name: en.ui.guard }).click()
  await expect(object).toHaveCount(0)
  await expect(page.getByRole('heading', { name: en.ui.hangUp })).toBeVisible()
})

test('scrolling changes the pinned phone to the current step', async ({ page }, info) => {
  test.skip(info.project.name === 'mobile-chromium', 'Small screens show all steps in a vertical story')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const story = page.locator('.story-layout')
  await expect(story).toHaveAttribute('data-pinned', 'true')
  await expect(story.locator('.story-stage')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
  const handset = (await story.locator('.story-scene .handset').boundingBox())!
  expect(handset.height).toBeGreaterThanOrEqual(440)
  expect(handset.width).toBeGreaterThanOrEqual(340)
  const scenes = [en.ui.practice.unknown, en.ui.practice.onSpeaker, en.ui.listening, en.ui.hangUp]
  for (const [index, text] of scenes.entries()) {
    await story.locator('.story-steps li').nth(index).evaluate(node => node.scrollIntoView({ block: 'center' }))
    await expect(story.locator('.story-stage')).toContainText(text)
  }
})

test('reduced motion leaves the hero and story illustrations static', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: en.ui.landing.headline })).toBeVisible()
  await expect(page.locator('.phone-object')).toHaveCSS('transform', 'none')
  await expect(page.locator('.hero-field canvas')).toHaveCount(0)
  if (info.project.name === 'mobile-chromium') {
    await expect(page.locator('.story-layout .handset')).toHaveCount(1)
    await expect(page.locator('.story-stage .story-scene')).toHaveCSS('animation-name', 'none')
  } else {
    await expect(page.locator('.story-stage')).toHaveCount(0)
    await expect(page.locator('.story-steps .handset')).toHaveCount(4)
  }
})

test('the Telugu mobile story reuses one readable handset for each step', async ({ page }, info) => {
  test.skip(info.project.name !== 'mobile-chromium', 'Uses the touch viewport')
  await page.goto('/')
  await page.getByRole('combobox', { name: en.ui.language }).selectOption('te')
  const { ui } = te
  const story = page.getByRole('region', { name: ui.landing.works })
  const next = story.getByRole('button', { name: ui.guide.next })
  for (const [index, step] of ui.landing.steps.entries()) {
    await expect(story.getByRole('heading', { name: step })).toBeVisible()
    await expect(story.locator('.handset')).toHaveCount(1)
    await expectReadableText(story, 16)
    if (index < ui.landing.steps.length - 1) await next.click()
  }
})

for (const target of ['landing', 'voice clip', 'red alert']) {
  for (const scheme of ['light', 'dark'] as const) {
    test(`${target} in ${scheme} meets automated WCAG checks`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme })
      await page.goto(target === 'red alert' ? '/?speech=mock' : target === 'voice clip' ? '/#/check-clip' : '/')
      if (target === 'red alert') {
        await page.getByRole('button', { name: en.ui.practice.realCall }).click()
        await page.getByRole('dialog', { name: en.ui.practice.realCall }).getByRole('button', { name: en.ui.guard }).click()
        await expect(page.getByRole('heading', { name: en.ui.hangUp })).toBeVisible()
      } else if (target === 'landing') {
        const selected = page.getByRole('button', { name: en.ui.tryIt.chips[0]![0] })
        await selected.click()
        await selected.hover()
      } else {
        await expect(page.getByRole('heading', { name: en.ui.clip.title })).toBeVisible()
        await expect(page.locator('.clip-sample')).toHaveCount(4)
      }
      if (target !== 'red alert') {
        await expect(page.locator('.app-shell')).toHaveCSS('background-color', scheme === 'light' ? 'rgb(243, 244, 241)' : 'rgb(25, 28, 30)')
      }
      const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']
      if (target === 'red alert') tags.push('wcag2aaa')
      const result = await new AxeBuilder({ page }).withTags(tags).analyze()
      expect(result.violations).toEqual([])
    })
  }
}
