import { expect, test } from '@playwright/test'
import en from '../../src/i18n/en.json' with { type: 'json' }
import { mockClipWorker } from './clip-fixture'

test.use({ serviceWorkers: 'block' })

for (const id of ['en-arrest', 'en-bank']) {
  test(`checks the bundled ${id} clip through the Whisper worker protocol`, async ({ page }) => {
    const sample = await mockClipWorker(page, id)
    await page.goto('/#/check-clip')
    await expect(page.getByRole('heading', { name: en.ui.clip.title })).toBeVisible()
    const card = page.getByRole('article', { name: sample.title })
    await expect(card.getByText(en.ui.clip.computerVoice)).toBeVisible()
    await card.getByRole('button', { name: en.ui.clip.check }).click()
    await expect(page.locator('.check-verdict')).toContainText(id === 'en-arrest' ? en.ui['scam-likely'] : en.ui.clip.genuine)
    await expect(page.locator('.highlighted-words')).toContainText(sample.dialogue[2]!)
    if (id === 'en-arrest') await expect(page.locator('mark a', { hasText: 'digital arrest' })).toBeVisible()
    await page.getByRole('button', { name: en.ui.clip.clear }).click()
    await expect(page.locator('.highlighted-words')).toHaveCount(0)
    await expect(page.getByText(en.ui.microphoneOn)).toHaveCount(0)
  })
}
