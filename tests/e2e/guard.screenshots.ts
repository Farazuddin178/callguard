import { writeFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import sharp from 'sharp'
import en from '../../src/i18n/en.json' with { type: 'json' }
import hi from '../../src/i18n/hi.json' with { type: 'json' }
import te from '../../src/i18n/te.json' with { type: 'json' }

async function saveMobileScreenshot(page: Page, filename: string) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  const raw = await page.screenshot({ animations: 'disabled', fullPage: true })
  const png = await sharp(raw)
    .resize({ width: 1000, withoutEnlargement: true })
    .png({ palette: true })
    .toBuffer()
  expect(png.byteLength).toBeLessThan(2_000_000)
  await writeFile(`docs/evidence/img/${filename}`, png)
}

for (const [language, { ui }] of Object.entries({ en, hi, te })) {
  test(`capture the ${language} listening and red alert screens on mobile`, async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-chromium', 'Capture with the Pixel 7 viewport')
    const start = new Date('2026-01-01T00:00:00Z')
    await page.clock.install({ time: start })
    await page.clock.pauseAt(new Date(start.getTime() + 10_000))
    await page.goto('/?speech=mock')
    await page.getByRole('combobox', { name: en.ui.language }).selectOption(language)
    await page.getByRole('button', { name: ui.guard }).click()
    await expect(page.getByRole('heading', { name: ui.listening })).toBeVisible()
    await expect(page.getByText(ui.microphoneOn)).toBeVisible()
    await saveMobileScreenshot(page, `stage-4b-listening-${language}-mobile-chromium.png`)

    await page.clock.runFor(3_600)
    await expect(page.getByRole('heading', { name: ui.hangUp })).toBeVisible()
    await saveMobileScreenshot(page, `stage-4b-alert-${language}-mobile-chromium.png`)
  })
}
