import { expect, type Locator } from '@playwright/test'

export async function expectReadableText(area: Locator, phoneMinimum = 14) {
  const result = await area.evaluate((root, minimum) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    let count = 0
    const small: string[] = []
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.textContent?.trim()
      const parent = node.parentElement
      if (!text || !parent || parent.closest('svg, .sr-only') || !parent.checkVisibility({ visibilityProperty: true })) continue
      const range = new Range()
      range.selectNodeContents(node)
      if (![...range.getClientRects()].some(box => box.width && box.height)) continue
      count++
      const handset = parent.closest('.handset')
      let scale = 1
      for (let element: Element | null = parent; handset && element && root.contains(element); element = element.parentElement) {
        const transform = getComputedStyle(element).transform
        if (transform === 'none') continue
        const matrix = new DOMMatrixReadOnly(transform)
        scale *= Math.min(Math.hypot(matrix.m11, matrix.m12), Math.hypot(matrix.m21, matrix.m22))
      }
      const size = Number.parseFloat(getComputedStyle(parent).fontSize) * scale
      if (size < (handset ? minimum : 18)) small.push(`${text.slice(0, 80)} (${size.toFixed(1)}px)`)
    }
    return { count, small }
  }, phoneMinimum)
  expect(result.count).toBeGreaterThan(0)
  expect(result.small).toEqual([])
}
