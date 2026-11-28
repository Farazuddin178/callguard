import { expect, test, type Locator, type Page } from '@playwright/test'
import en from '../../src/i18n/en.json' with { type: 'json' }
import hi from '../../src/i18n/hi.json' with { type: 'json' }
import te from '../../src/i18n/te.json' with { type: 'json' }

async function expectFullSizeControls(area: Locator) {
  const small = await area.locator('button, a[href], input, select').evaluateAll(controls => controls
    .filter(control => control.getClientRects().length > 0)
    .flatMap(control => {
      const { width, height } = control.getBoundingClientRect()
      return width >= 56 && height >= 56 ? [] : [control.outerHTML]
    }))
  expect(small).toEqual([])
}

async function startGuard(page: Page) {
  await page.getByRole('button', { name: en.ui.practice.realCall }).click()
  await expect(page.getByText(en.ui.microphoneOn)).toHaveCount(0)
  const prompt = page.getByRole('dialog', { name: en.ui.practice.realCall })
  await expectFullSizeControls(prompt)
  await prompt.getByRole('button', { name: en.ui.guard }).click()
}
async function expectVisibleDial(page: Page) {
  const gauge = page.locator('.gauge')
  await expect(gauge).toBeVisible()
  const bounds = await gauge.boundingBox()
  const pivot = await gauge.locator('.gauge-pin').boundingBox()
  const needle = await gauge.locator('.gauge-needle').boundingBox()
  expect(bounds && pivot && pivot.y + pivot.height < bounds.y + bounds.height).toBe(true)
  expect(bounds && needle && needle.height > 8 && needle.y + needle.height < bounds.y + bounds.height).toBe(true)
}

test('a guarded call shows the microphone, then escalates and offers 1930', async ({ page }) => {
  await page.goto('/?speech=mock')
  await expect(page.getByText(en.ui.microphoneOn)).toHaveCount(0)
  await startGuard(page)
  await expect(page.getByText(en.ui.microphoneOn)).toBeVisible()
  await expect(page.getByText(en.ui.safe, { exact: true })).toBeVisible()
  await expectVisibleDial(page)
  await expect(page.getByText(en.ui.careful, { exact: true })).toBeVisible()
  await expectVisibleDial(page)
  await expect(page.getByRole('heading', { name: en.ui.hangUp })).toBeVisible()
  await expect(page.getByText(en.ui.microphoneOn)).toBeVisible()
  await expectVisibleDial(page)
  await expectFullSizeControls(page.getByRole('main'))
  await expect(page.getByRole('link', { name: en.ui.helpline })).toHaveAttribute('href', 'tel:1930')
  await expect(page.getByText(en.ruleExplanations['digital-arrest'])).toBeVisible()
  await expect(page.getByRole('link', { name: en.ui.familySend })).toHaveCount(0)
  await page.getByRole('button', { name: en.ui.hungUp }).click()
  await expect(page.getByText(en.ui.microphoneOn)).toHaveCount(0)
  await expect(page.getByRole('button', { name: en.ui.practice.realCall })).toBeVisible()
})

test('home and opening Speech check leave the microphone off', async ({ page }) => {
  await page.addInitScript(() => {
    let microphoneRequests = 0
    Object.defineProperty(document, 'microphoneRequests', { get: () => microphoneRequests })
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: () => {
        microphoneRequests += 1
        return Promise.reject(new Error('Unexpected microphone request'))
      },
    })
  })
  await page.goto('/')
  await page.getByRole('button', { name: en.ui.settings }).click()
  await page.getByRole('link', { name: en.ui.speechCheck }).click()
  await expect(page.getByRole('button', { name: en.ui.beginCheck })).toBeVisible()
  expect(await page.evaluate(() => Reflect.get(document, 'microphoneRequests'))).toBe(0)
})

test('Stop hides the microphone indicator and returns home', async ({ page }) => {
  await page.goto('/?speech=mock')
  await expectFullSizeControls(page.getByRole('main'))
  await page.getByRole('button', { name: en.ui.privacy }).click()
  const privacy = page.getByRole('dialog', { name: en.ui.privacy })
  await expect(privacy.getByRole('heading', { name: en.ui.privacy })).toBeFocused()
  await expectFullSizeControls(privacy)
  await privacy.getByRole('button', { name: en.ui.close }).click()
  await startGuard(page)
  await expect(page.getByText(en.ui.microphoneOn)).toBeVisible()
  await expectFullSizeControls(page.getByRole('main'))
  await page.getByRole('button', { name: en.ui.stop }).click()
  await expect(page.getByText(en.ui.microphoneOn)).toHaveCount(0)
  await expect(page.getByRole('button', { name: en.ui.practice.realCall })).toBeVisible()
})

test('an opt-in family alert opens a fixed, prefilled WhatsApp message', async ({ page }) => {
  await page.goto('/?speech=mock')
  await page.getByRole('button', { name: en.ui.settings }).click()
  const sheet = page.getByRole('dialog', { name: en.ui.settings })
  await expectFullSizeControls(sheet)
  await expect(sheet.getByText(en.ui.switchOff, { exact: true })).toBeVisible()
  await expect(sheet.getByRole('switch', { name: en.ui.familySetting })).not.toBeChecked()
  await sheet.getByRole('switch', { name: en.ui.familySetting }).check()
  await expect(sheet.getByText(en.ui.switchOn, { exact: true })).toBeVisible()
  await expect(sheet.getByRole('textbox', { name: en.ui.familyNumber })).toBeVisible()
  await expectFullSizeControls(sheet)
  await sheet.getByRole('button', { name: en.ui.close }).click()
  await page.reload()
  await startGuard(page)
  const family = page.getByRole('link', { name: en.ui.familySend })
  await expect(family).toHaveAttribute('href', `https://wa.me/?text=${encodeURIComponent(en.ui.familyMessage)}`)
  await expectFullSizeControls(page.getByRole('main'))
})

test('speech check caches its runtime on demand for later offline use', async ({ page, context }) => {
  const speechRequests: string[] = []
  page.on('request', request => {
    if (/whisper\.worker-|capture\.worklet-|ort-wasm/.test(request.url())) speechRequests.push(request.url())
  })
  await page.addInitScript(() => {
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: () => {
        document.documentElement.dataset.microphoneRequested = 'true'
        throw new Error('Opening Speech Check requested microphone access')
      },
    })
  })
  await page.goto('/')
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  expect(speechRequests).toEqual([])
  await page.getByRole('button', { name: en.ui.settings }).click()
  await page.getByRole('link', { name: en.ui.speechCheck }).click()
  await expect(page.getByRole('heading', { name: en.ui.speechCheck })).toBeVisible()
  await expect(page.getByText(en.ui.microphoneOn)).toHaveCount(0)
  await expectFullSizeControls(page.getByRole('main'))
  await page.waitForFunction(async () => {
    const cache = await caches.open('callguard-speech-runtime')
    return (await cache.keys()).length === 4
  })
  await expect(page.getByRole('button', { name: en.ui.beginCheck })).toBeEnabled()
  await expect(page.locator('html')).not.toHaveAttribute('data-microphone-requested', 'true')

  const paths = await page.evaluate(async () => {
    const cache = await caches.open('callguard-speech-runtime')
    return (await cache.keys()).map(request => request.url)
  })
  expect(paths.some(path => path.endsWith('.wasm'))).toBe(true)
  expect(paths.some(path => path.includes('whisper.worker-'))).toBe(true)
  await context.setOffline(true)
  const results = await page.evaluate(urls => Promise.all(urls.map(async url => {
    const response = await fetch(url, { cache: 'reload' })
    await response.body?.cancel()
    return response.ok
  })), paths)
  expect(results).toEqual([true, true, true, true])
})

for (const [language, { ui, ruleExplanations }] of Object.entries({ en, hi, te })) {
  test(`the ${language} sample reaches a real warning with the microphone off`, async ({ page }) => {
    await page.addInitScript(() => {
      document.documentElement.dataset.microphoneRequests = '0'
      Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
        value: () => {
          document.documentElement.dataset.microphoneRequests = '1'
          throw new Error('The demo requested microphone access')
        },
      })
    })
    await page.goto('/')
    await page.getByRole('combobox', { name: en.ui.language }).selectOption(language)
    const phone = page.getByRole('region', { name: ui.demo })
    await expect(phone.getByText(ui.practice.unknown)).toBeVisible()
    await expect(phone.locator('.phone-stage')).toHaveAttribute('data-mood', 'neutral')
    await phone.getByRole('button', { name: ui.practice.decline }).click()
    await expect(phone.getByText(ui.practice.ended)).toBeVisible()
    await phone.getByRole('button', { name: ui.practice.replay }).click()
    await expect(phone.getByRole('button', { name: ui.practice.answer })).toBeFocused()
    await page.getByRole('button', { name: ui.sample }).click()
    await expect(phone.getByText(ui.practice.onSpeaker)).toBeVisible()
    await expect(phone.getByText(ui.demoMicOff, { exact: true })).toBeVisible()
    await phone.getByRole('button', { name: ui.guard }).click()
    await expect(phone.getByRole('heading', { name: ui.hangUp })).toBeVisible()
    await expect(phone.locator('.phone-stage')).toHaveAttribute('data-mood', 'warning')
    await expect(phone.locator('.phone-words mark').first()).toBeVisible()
    await expect(phone.getByText(ruleExplanations['digital-arrest'])).toBeVisible()
    await expect(phone.getByRole('button', { name: ui.helpline })).toBeDisabled()
    await phone.getByRole('button', { name: ui.practice.endCall, exact: true }).click()
    await expect(phone.getByText(ui.practice.ended)).toBeVisible()
    await expect(page.getByRole('button', { name: ui.practice.realCall })).toBeVisible()
    await expect(page.locator('html')).not.toHaveAttribute('data-microphone-requests', '1')
  })

  test(`the ${language} real bank scenario stays safe and can be replayed`, async ({ page }) => {
    await page.goto('/')
    await page.getByRole('combobox', { name: en.ui.language }).selectOption(language)
    const phone = page.getByRole('region', { name: ui.demo })
    await phone.getByRole('button', { name: ui.practice.bank, exact: true }).click()
    await phone.getByRole('button', { name: ui.practice.answer }).click()
    await expect(phone.getByText(ui.practice.onSpeaker)).toBeVisible()
    await phone.getByRole('button', { name: ui.guard }).click()
    await expect(phone.locator('.risk-card')).toHaveAttribute('data-level', 'safe')
    await expect(phone.getByText(ui.practice.looksSafe, { exact: true })).toBeVisible()
    await expect(phone.locator('.phone-stage')).toHaveAttribute('data-mood', 'safe')
    await expect(phone.getByRole('heading', { name: ui.hangUp })).toHaveCount(0)
    await phone.getByRole('button', { name: ui.practice.replay }).click()
    await expect(phone.getByRole('button', { name: ui.practice.answer })).toBeFocused()
  })
}
