import { expect, test } from '@playwright/test'

test('the app shell loads offline after the service worker activates', async ({ page, context }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('CallGuard')
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', /manifest\.webmanifest$/)
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)

  await context.setOffline(true)
  await page.reload()
  await expect(page).toHaveTitle('CallGuard')
})
