import { useEffect, useRef } from 'react'
import { useSpring } from 'motion/react'
import { animate } from 'motion/mini'

export default function PhoneTilt() {
  const marker = useRef<HTMLSpanElement>(null)
  const x = useSpring(0, { stiffness: 170, damping: 25 })
  const y = useSpring(0, { stiffness: 170, damping: 25 })

  useEffect(() => {
    const object = marker.current?.parentElement
    const stage = object?.parentElement
    if (!object || !stage) return
    const title = stage.closest('.landing-hero')?.querySelector<HTMLElement>('#screen-title')
    let entrance: ReturnType<typeof animate>[] = []
    const frame = requestAnimationFrame(() => {
      if (!title || title.dataset.entered) return
      title.dataset.entered = 'true'
      entrance = Array.from(title.querySelectorAll<HTMLElement>('.hero-word'), (word, index) =>
        animate(word, { opacity: [.3, 1], transform: ['translateY(8px)', 'translateY(0)'] },
          { duration: .44, delay: index * .045, ease: [.22, .7, .28, 1] }))
    })
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)')
    const leave = () => {
      x.set(0)
      y.set(0)
    }
    const move = (event: PointerEvent) => {
      if (!finePointer.matches || event.pointerType === 'touch') return
      const bounds = stage.getBoundingClientRect()
      x.set((0.5 - (event.clientY - bounds.top) / bounds.height) * 9)
      y.set(((event.clientX - bounds.left) / bounds.width - 0.5) * 12)
    }
    const stopX = x.on('change', value => object.style.setProperty('--tilt-x', value + 'deg'))
    const stopY = y.on('change', value => object.style.setProperty('--tilt-y', value + 'deg'))
    stage.addEventListener('pointermove', move)
    stage.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(frame)
      for (const animation of entrance) animation.cancel()
      stage.removeEventListener('pointermove', move)
      stage.removeEventListener('pointerleave', leave)
      stopX()
      stopY()
      x.jump(0)
      y.jump(0)
      object.style.setProperty('--tilt-x', '0deg')
      object.style.setProperty('--tilt-y', '0deg')
    }
  }, [x, y])

  return <span ref={marker} hidden />
}
