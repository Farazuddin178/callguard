import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'

type HeaderRule = { source: string; headers: { key: string; value: string }[] }

it('limits outbound connections to the app and model hosts and protects browser permissions', () => {
  const config: { headers: HeaderRule[] } = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  const globalHeaders = config.headers.find(rule => rule.source === '/(.*)')?.headers ?? []
  const headers = new Map(globalHeaders.map(({ key, value }) => [key, value]))
  expect(headers.get('Permissions-Policy')).toBe('microphone=(self), camera=(), geolocation=()')
  expect(headers.get('Referrer-Policy')).toBe('no-referrer')
  expect(headers.get('X-Content-Type-Options')).toBe('nosniff')

  const csp = new Map(headers.get('Content-Security-Policy')?.split(';').map(directive => {
    const [name, ...values] = directive.trim().split(/\s+/)
    return [name, values]
  }))
  expect(csp.get('default-src')).toEqual(["'self'"])
  expect(csp.get('connect-src')).toEqual(["'self'", 'https://huggingface.co', 'https://*.hf.co'])
  expect(csp.get('script-src')).toEqual(["'self'", "'wasm-unsafe-eval'"])
  expect(csp.get('worker-src')).toEqual(["'self'"])
})
