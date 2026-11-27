import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/live',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: { ...devices['Desktop Chrome'], baseURL: 'https://callguard-six.vercel.app' },
})
