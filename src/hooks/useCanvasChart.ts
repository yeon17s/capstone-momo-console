import { useEffect, useRef } from 'react'

type Draw = (c: CanvasRenderingContext2D, width: number, height: number) => void

/**
 * 부모 폭에 맞춰 canvas 를 다시 그리는 훅. `draw` 는 useCallback 으로 메모이즈할 것.
 */
export function useCanvasChart(height: number, draw: Draw) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const parent = canvas?.parentElement
    if (!canvas || !parent) return

    const paint = () => {
      const width = Math.max(300, parent.clientWidth - 42)
      const ratio = window.devicePixelRatio || 1
      canvas.width = width * ratio
      canvas.height = height * ratio
      canvas.style.height = height + 'px'
      canvas.style.width = '100%'
      const c = canvas.getContext('2d')
      if (!c) return
      c.scale(ratio, ratio)
      c.fillStyle = '#1E2433'
      c.fillRect(0, 0, width, height)
      c.font = '12px system-ui, sans-serif'
      c.fillStyle = '#CDD3E0'
      draw(c, width, height)
    }

    paint()
    let timer: ReturnType<typeof setTimeout>
    const observer = new ResizeObserver(() => {
      clearTimeout(timer)
      timer = setTimeout(paint, 100)
    })
    observer.observe(parent)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [height, draw])

  return ref
}
