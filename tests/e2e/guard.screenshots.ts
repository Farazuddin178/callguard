import { expect, test } from '@playwright/test'
import en from '../../src/i18n/en.json' with { type: 'json' }
import hi from '../../src/i18n/hi.json' with { type: 'json' }
import te from '../../src/i18n/te.json' with { type: 'json' }

import { saveScreenshot } from './screenshot-file'

for (const [language, { ui }] of Object.entries({ en, hi, te })) {
  test(`capture the ${language} listening and red alert screens on mobile`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium', 'Capture with the Pixel 7 viewport')
    const start = new Date('2026-01-01T00:00:00Z')
    await page.clock.install({ time: start })
    await page.clock.pauseAt(new Date(start.getTime() + 10_000))
    await page.goto('/?speech=mock')
    await page.getByRole('combobox', { name: en.ui.language }).selectOption(language)
    await page.getByRole('button', { name: ui.practice.realCall }).click()
    await page.getByRole('dialog', { name: ui.practice.realCall }).getByRole('button', { name: ui.guard }).click()
    await expect(page.getByRole('heading', { name: ui.listening })).toBeVisible()
    await expect(page.getByText(ui.microphoneOn)).toBeVisible()
    await saveScreenshot(page, `stage-5-review-listening-${language}-mobile-chromium.png`)

    await page.clock.runFor(3_600)
    await expect(page.getByRole('heading', { name: ui.hangUp })).toBeVisible()
    await saveScreenshot(page, `stage-5-review-alert-${language}-mobile-chromium.png`)
  })
}
