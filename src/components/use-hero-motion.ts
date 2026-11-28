import { useEffect, useState, type RefObject } from 'react'

type MotionDevice = Navigator & {
  deviceMemory?: number
  connection?: EventTarget & { saveData?: boolean }
}

export function useHeroMotion(stage: RefObject<HTMLElement | null>) {
  const [running, setRunning] = useState(false)
  useEffect(() => {
    const element = stage.current
    if (!element || !('IntersectionObserver' in window)) return
    const device = navigator as MotionDevice
    if (device.hardwareConcurrency <= 4 || (device.deviceMemory ?? Infinity) <= 4) return
    const motion = matchMedia('(prefers-reduced-motion: no-preference)')
    let visible = false
    function update() {
      setRunning(visible && motion.matches && !device.connection?.saveData && !document.hidden)
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting
      update()
    })
    observer.observe(element)
    motion.addEventListener('change', update)
    document.addEventListener('visibilitychange', update)
    device.connection?.addEventListener('change', update)
    return () => {
      observer.disconnect()
      motion.removeEventListener('change', update)
      document.removeEventListener('visibilitychange', update)
      device.connection?.removeEventListener('change', update)
    }
  }, [stage])
  return running
}
