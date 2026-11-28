import { useRef, type PointerEvent } from 'react'

export function useHorizontalSwipe(turn: (direction: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  return {
    onPointerDown(event: PointerEvent<HTMLDivElement>) {
      if (event.pointerType !== 'touch' || (event.target instanceof Element && event.target.closest('button, a'))) return
      start.current = { x: event.clientX, y: event.clientY, id: event.pointerId }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    onPointerUp(event: PointerEvent<HTMLDivElement>) {
      const point = start.current
      start.current = null
      if (!point || point.id !== event.pointerId) return
      const dx = event.clientX - point.x
      if (Math.abs(dx) >= 48 && Math.abs(dx) > Math.abs(event.clientY - point.y) * 1.4) turn(dx < 0 ? 1 : -1)
    },
    onPointerCancel() { start.current = null },
  }
}
