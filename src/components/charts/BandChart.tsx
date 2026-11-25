import { useCallback } from 'react'
import { useCanvasChart } from '../../hooks/useCanvasChart'
import { COLORS } from '../../lib/charts'

export interface BandSeries {
  name: string
  color: string
  m: number[]
  lo: number[]
  hi: number[]
}

const HEIGHT = 300

function tick(v: number): string {
  return Math.abs(v) >= 1000 || (Math.abs(v) < 0.01 && v !== 0) ? v.toExponential(1) : String(Number(v.toPrecision(3)))
}

/** 중앙값 선 + q10~q90 띠. x 는 정렬 진행률(%)이며 실제 시간이 아니다. */
export function BandChart({ x, series, label }: { x: number[]; series: BandSeries[]; label: string }) {
  const draw = useCallback(
    (c: CanvasRenderingContext2D, w: number, h: number) => {
      const L = 62
      const R = 16
      const T = 28
      const B = h - 38
      const ys = series.flatMap((s) => [...s.lo, ...s.hi, ...s.m])
      if (!ys.length || !x.length) return
      let y0 = Math.min(...ys)
      let y1 = Math.max(...ys)
      if (y1 === y0) {
        y0 -= 0.5
        y1 += 0.5
      }
      const x0 = x[0]
      const x1 = x[x.length - 1]
      const X = (v: number) => L + ((v - x0) / (x1 - x0 || 1)) * (w - L - R)
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
        const v = x0 + ((x1 - x0) * i) / 4
        c.fillText(`${Math.round(v)}%`, X(v), B + 16)
      }
      c.fillText('정렬 진행률 (실제 시각 아님)', (L + w - R) / 2, h - 6)

      series.forEach((s, i) => {
        c.fillStyle = s.color + '33'
        c.beginPath()
        x.forEach((v, k) => (k ? c.lineTo(X(v), Y(s.hi[k])) : c.moveTo(X(v), Y(s.hi[k]))))
        for (let k = x.length - 1; k >= 0; k--) c.lineTo(X(x[k]), Y(s.lo[k]))
        c.closePath()
        c.fill()
        c.strokeStyle = s.color
        c.lineWidth = 2
        c.beginPath()
        x.forEach((v, k) => (k ? c.lineTo(X(v), Y(s.m[k])) : c.moveTo(X(v), Y(s.m[k]))))
        c.stroke()
        c.fillStyle = s.color
        c.textAlign = 'left'
        c.fillText(s.name, L + 8 + i * 190, 16)
      })
    },
    [x, series],
  )
  const ref = useCanvasChart(HEIGHT, draw)
  return (
    <div style={{ padding: '0 21px' }}>
      <canvas ref={ref} role="img" aria-label={label} />
    </div>
  )
}
