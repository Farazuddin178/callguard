import { expect, test } from 'vitest'
import { cn } from '../src/lib/utils'

test('shadcn classes support conditional values and Tailwind overrides', () => {
  expect(cn('px-2 text-sm', { hidden: false }, 'px-4')).toBe('text-sm px-4')
})
