import { useCallback } from 'react'
import { useCanvasChart } from '../../hooks/useCanvasChart'
import type { Line } from '../../lib/api/series'
import { COLORS } from '../../lib/charts'

const PALETTE = ['#4D86E8', '#D96B2A', '#6CC59B', '#E0B64A', '#B58CE8', '#E86C8E']
const HEIGHT = 260

function tick(v: number): string {
  return Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0) ? v.toExponential(1) : String(Number(v.toPrecision(4)))
}

/** 값이 null 인 지점에서 선을 끊는 라인 차트. 결측 구간을 이어 그리지 않는다. */
export function LineChart({ lines, xLabel, label }: { lines: Line[]; xLabel: string; label: string }) {
  const draw = useCallback(
    (c: CanvasRenderingContext2D, w: number, h: number) => {
      const L = 60
      const R = 16
      const T = 24
      const B = h - 36
      const all = lines.flatMap((l) => l.points).filter((p) => p.v !== null) as { t: number; v: number }[]
      if (!all.length) {
        c.fillText('표시할 값이 없습니다', L, T + 20)
        return
      }
      let x0 = Math.min(...all.map((p) => p.t))
      let x1 = Math.max(...all.map((p) => p.t))
      let y0 = Math.min(...all.map((p) => p.v))
      let y1 = Math.max(...all.map((p) => p.v))
      if (x1 === x0) {
        x0 -= 0.5
        x1 += 0.5
      }
      if (y1 === y0) {
        y0 -= 0.5
        y1 += 0.5
      }
      const X = (t: number) => L + ((t - x0) / (x1 - x0)) * (w - L - R)
      const Y = (v: number) => B - ((v - y0) / (y1 - y0)) * (B - T)

      c.strokeStyle = COLORS.grid
      c.fillStyle = COLORS.text
      c.textAlign = 'right'
      for (let i = 0; i <= 4; i++) {
        const v = y0 + ((y1 - y0) * i) / 4
        c.beginPath()
        c.moveTo(L, Y(v))
        c.lineTo(w - R, Y(v))
        c.stroke()
        c.fillText(tick(v), L - 6, Y(v) + 4)
      }
      c.textAlign = 'center'
      for (let i = 0; i <= 4; i++) {
        const t = x0 + ((x1 - x0) * i) / 4
        c.fillText(tick(t), X(t), B + 16)
      }
      c.fillText(xLabel, (L + w - R) / 2, h - 6)

      lines.forEach((line, i) => {
        c.strokeStyle = c.fillStyle = PALETTE[i % PALETTE.length]
        c.lineWidth = 1.5
        let open = false
        let prev: { t: number; v: number } | null = null
        let run = 0
        c.beginPath()
        for (const p of line.points) {
          if (p.v === null) {
            if (open && run === 1 && prev) c.fillRect(X(prev.t) - 2, Y(prev.v) - 2, 4, 4)
            open = false
            run = 0
            prev = null
            continue
          }
          if (!open) c.moveTo(X(p.t), Y(p.v))
          else c.lineTo(X(p.t), Y(p.v))
          open = true
          run++
          prev = { t: p.t, v: p.v }
        }
        if (open && run === 1 && prev) c.fillRect(X(prev.t) - 2, Y(prev.v) - 2, 4, 4)
        c.stroke()
        c.textAlign = 'left'
        c.fillText(line.name, L + 8 + i * 120, 14)
      })
    },
    [lines, xLabel],
  )
  const ref = useCanvasChart(HEIGHT, draw)
  return (
    <div style={{ padding: '0 21px' }}>
      <canvas ref={ref} role="img" aria-label={label} />
    </div>
  )
}
