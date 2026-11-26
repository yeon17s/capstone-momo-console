import type { CategoryRow, CycleRow } from '../types'
import { num, pct } from './format'

export interface Histogram {
  lo: number
  hi: number
  normal: number[]
  anomaly: number[]
}

export function histogramData(rows: CycleRow[], bins = 24): Histogram {
  const values = rows.map((r) => r.score).filter(Number.isFinite)
  let lo = Math.min(...values)
  let hi = Math.max(...values)
  if (hi === lo) {
    lo -= 0.5
    hi += 0.5
  }
  const normal: number[] = Array(bins).fill(0)
  const anomaly: number[] = Array(bins).fill(0)
  for (const r of rows) {
    if (!Number.isFinite(r.score)) continue
    const b = Math.max(
      0,
      Math.min(bins - 1, Math.floor(((r.score - lo) / (hi - lo)) * bins)),
    )
    ;(r.anomaly ? anomaly : normal)[b]++
  }
  return { lo, hi, normal, anomaly }
}

export const COLORS = {
  normal: '#4D86E8',
  anomaly: '#D96B2A',
  text: '#CDD3E0',
  strong: '#F7F9FC',
  grid: '#343C52',
  bg: '#1E2433',
}

type Ctx = CanvasRenderingContext2D

export function drawDistribution(
  c: Ctx,
  w: number,
  d: Histogram,
  threshold: number,
) {
  const L = 50
  const R = 18
  const T = 44
  const B = 245
  const pw = w - L - R
  const ph = B - T
  const max = Math.max(1, ...d.normal, ...d.anomaly)

  for (let i = 0; i <= 4; i++) {
    const y = B - (ph * i) / 4
    c.strokeStyle = COLORS.grid
    c.beginPath()
    c.moveTo(L, y)
    c.lineTo(w - R, y)
    c.stroke()
    c.fillStyle = COLORS.text
    c.textAlign = 'right'
    c.fillText(num((max * i) / 4, 0), L - 8, y + 4)
  }

  const step = pw / d.normal.length
  for (let i = 0; i < d.normal.length; i++) {
    const series: [number, number[], string][] = [
      [0, d.normal, COLORS.normal],
      [1, d.anomaly, COLORS.anomaly],
    ]
    for (const [j, counts, color] of series) {
      c.fillStyle = color
      const h = (counts[i] / max) * ph
      c.fillRect(L + i * step + j * step * 0.43, B - h, Math.max(1, step * 0.4), h)
    }
  }

  const tx = Math.max(
    L,
    Math.min(w - R, L + ((threshold - d.lo) / (d.hi - d.lo)) * pw),
  )
  c.save()
  c.strokeStyle = COLORS.strong
  c.setLineDash([5, 4])
  c.beginPath()
  c.moveTo(tx, T)
  c.lineTo(tx, B)
  c.stroke()
  c.restore()
  c.fillStyle = COLORS.strong
  // '건수' 는 y=14 에 있으므로 임계값 라벨은 한 줄 아래(T-8)에 두고, 가장자리에서는 정렬을 바꿔 잘리지 않게 한다.
  c.textAlign = tx < L + 36 ? 'left' : tx > w - R - 36 ? 'right' : 'center'
  c.fillText(num(threshold, 5), tx, T - 8)

  for (let i = 0; i <= 4; i++) {
    c.textAlign = i === 0 ? 'left' : i === 4 ? 'right' : 'center'
    c.fillStyle = COLORS.text
    c.fillText(num(d.lo + ((d.hi - d.lo) * i) / 4, 3), L + (pw * i) / 4, B + 23)
  }
  c.textAlign = 'left'
  c.fillText('건수', L, 14)
}

export const RECALL_ROW_HEIGHT = 34

export function recallChartHeight(rowCount: number) {
  return Math.max(180, rowCount * RECALL_ROW_HEIGHT + 55)
}

export function drawRecall(c: Ctx, w: number, h: number, rows: CategoryRow[]) {
  const L = Math.min(190, w * 0.46)
  const R = 65
  const T = 30
  const pw = w - L - R

  for (let i = 0; i <= 4; i++) {
    const x = L + (pw * i) / 4
    c.strokeStyle = COLORS.grid
    c.beginPath()
    c.moveTo(x, T - 8)
    c.lineTo(x, h - 20)
    c.stroke()
    c.fillStyle = COLORS.text
    c.textAlign = 'center'
    c.fillText(i * 25 + '%', x, 15)
  }

  rows.forEach((r, i) => {
    const y = T + i * RECALL_ROW_HEIGHT
    c.fillStyle = COLORS.text
    c.textAlign = 'right'
    c.font = '11px system-ui, sans-serif'
    c.fillText(r.category_name, L - 10, y + 15)
    if (Number.isFinite(r.recall)) {
      c.fillStyle = COLORS.normal
      c.fillRect(L, y, pw * r.recall, 23)
      c.fillStyle = COLORS.strong
      c.textAlign = 'left'
      c.fillText(pct(r.recall), L + pw * r.recall + 7, y + 16)
    }
  })
}
