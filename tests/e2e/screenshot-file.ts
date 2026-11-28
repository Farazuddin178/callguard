import { writeFile } from 'node:fs/promises'
import { expect, type Page } from '@playwright/test'
import sharp from 'sharp'

export async function saveScreenshot(page: Page, filename: string, fullPage = true) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
  const raw = await page.screenshot({ animations: 'disabled', fullPage, scale: 'css', timeout: 180_000 })
  const png = await sharp(raw)
    .resize({ width: 1000, withoutEnlargement: true })
    .png({ palette: true, colours: 128 })
    .toBuffer()
  expect(png.byteLength).toBeLessThan(2_000_000)
  await writeFile(`docs/evidence/img/${filename}`, png)
}
