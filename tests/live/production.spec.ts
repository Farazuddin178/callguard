import { expect, test } from '@playwright/test'
import en from '../../src/i18n/en.json' with { type: 'json' }

test('production serves the privacy headers and the English demo reaches the red alert', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.ok()).toBe(true)
  const headers = await response?.allHeaders()
  expect(headers?.['permissions-policy']).toContain('microphone=(self)')
  expect(headers?.['content-security-policy']).toContain("default-src 'self'")
  await expect(page).toHaveTitle('CallGuard')
  await expect(page.getByRole('heading', { name: en.ui.landing.headline })).toBeVisible()
  await page.getByRole('combobox', { name: en.ui.language }).selectOption('en')
  await page.getByRole('button', { name: en.ui.sample }).click()
  await expect(page.getByText(en.ui.demo, { exact: true })).toBeVisible()
  await expect(page.getByText(en.ui.demoMicOff, { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: en.ui.hangUp })).toBeVisible()
  await expect(page.getByText(en.ruleExplanations['digital-arrest'])).toBeVisible()
  await expect(page.getByRole('button', { name: en.ui.helpline })).toBeDisabled()
})
