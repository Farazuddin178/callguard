import { defineConfig, devices } from '@playwright/test'
import config from './playwright.config'

export default defineConfig({
  ...config,
  testMatch: '**/*.screenshots.ts',
  timeout: 240_000,
  workers: 1,
  projects: [
    ...(config.projects ?? []).map(project => project.name === 'mobile-chromium'
      ? { ...project, use: { ...project.use, viewport: { width: 412, height: 915 } } }
      : project),
    { name: 'chromium-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
  ],
  use: { ...config.use, colorScheme: 'light', reducedMotion: 'no-preference' },
})

