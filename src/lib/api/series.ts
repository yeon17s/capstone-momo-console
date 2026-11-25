/** `/series`, `/trends` 응답 행을 차트용 선으로 바꾸는 순수 함수. 누락을 보간하지 않는다. */

export const TIME_KEYS = ['t_s', 'monotonic_ns', 'issue_ns', 'available_ns'] as const
const GROUP_KEYS = ['servo_id', 'target'] as const
const EXCLUDED = new Set<string>([...TIME_KEYS, 'servo_id'])

export type Row = Record<string, unknown>

export interface Point {
  t: number
  /** null 이면 값 없음 → 선을 끊는다 */
  v: number | null
}

export interface Line {
  name: string
  points: Point[]
}

/** 중첩 객체를 `a.b` 경로의 스칼라로 평탄화한다. */
export function flattenRow(row: Row, prefix = '', out: Row = {}): Row {
  for (const [k, v] of Object.entries(row)) {
    const key = prefix ? `${prefix}.${k}` : k
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) flattenRow(v as Row, key, out)
    else out[key] = v
  }
  return out
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** 한 번이라도 유한한 숫자가 나온 열(시간·그룹 열 제외). */
export function numericColumns(rows: Row[]): string[] {
  const cols = new Set<string>()
  for (const row of rows) {
    for (const [k, v] of Object.entries(flattenRow(row))) {
      if (!EXCLUDED.has(k) && isNum(v)) cols.add(k)
    }
  }
  return [...cols]
}

export function groupKeyOf(rows: Row[]): (typeof GROUP_KEYS)[number] | null {
  const first = rows.find((r) => r && typeof r === 'object')
  if (!first) return null
  return GROUP_KEYS.find((k) => k in first) ?? null
}

/** 같은 선에서 인접 점 간격이 중앙 간격의 `factor`배를 넘으면 사이를 끊는다. */
function breakGaps(points: Point[], factor: number): Point[] {
  if (points.length < 3) return points
  const dts: number[] = []
  for (let i = 1; i < points.length; i++) {
    const dt = points[i].t - points[i - 1].t
    if (dt > 0) dts.push(dt)
  }
  if (!dts.length) return points
  dts.sort((a, b) => a - b)
  const median = dts[Math.floor(dts.length / 2)]
  const out: Point[] = [points[0]]
  for (let i = 1; i < points.length; i++) {
    if (points[i].t - points[i - 1].t > median * factor) out.push({ t: (points[i].t + points[i - 1].t) / 2, v: null })
    out.push(points[i])
  }
  return out
}

/**
 * `t_s` 기준 선 생성. 그룹 키(servo_id/target)가 있으면 그룹별 선.
 * `t_s` 가 없는 행은 그릴 수 없어 `skipped` 로 센다. 값이 없으면 null(끊김)이며 0 으로 채우지 않는다.
 */
export function buildLines(rows: Row[], column: string, gapFactor = 4): { lines: Line[]; skipped: number } {
  const groupKey = groupKeyOf(rows)
  const groups = new Map<string, Point[]>()
  let skipped = 0
  for (const row of rows) {
    const flat = flattenRow(row)
    const t = flat.t_s
    if (!isNum(t)) {
      skipped++
      continue
    }
    const name = groupKey ? `${groupKey}=${String(flat[groupKey])}` : column
    const v = flat[column]
    const list = groups.get(name) ?? []
    list.push({ t, v: isNum(v) ? v : null })
    groups.set(name, list)
  }
  const lines = [...groups.entries()]
    .map(([name, pts]) => ({ name, points: breakGaps(pts.sort((a, b) => a.t - b.t), gapFactor) }))
    .filter((l) => l.points.some((p) => p.v !== null))
  return { lines, skipped }
}

/** 시간 열이 보장되지 않는 `/trends` 점: 응답 순서(시간순)를 x(인덱스)로 사용한다. */
export function buildIndexLine(points: Row[], column: string): Line {
  return {
    name: column,
    points: points.map((p, i) => {
      const v = flattenRow(p)[column]
      return { t: i, v: isNum(v) ? v : null }
    }),
  }
}

/** 파형 구간 입력(문자열) → API 파라미터. 빈 값은 제한 없음, 잘못된 값은 오류. */
export function parseRange(from: string, to: string): { range: { from_s?: number; to_s?: number }; error?: string } {
  const range: { from_s?: number; to_s?: number } = {}
  for (const [key, raw, label] of [['from_s', from, '시작'], ['to_s', to, '끝']] as const) {
    const text = raw.trim()
    if (!text) continue
    const v = Number(text)
    if (!Number.isFinite(v)) return { range: {}, error: `${label} 값이 숫자가 아닙니다.` }
    range[key] = v
  }
  if (range.from_s !== undefined && range.to_s !== undefined && range.from_s > range.to_s) {
    return { range: {}, error: '시작이 끝보다 큽니다.' }
  }
  return { range }
}
