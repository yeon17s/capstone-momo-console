import type { CyclesQuery, TruthLabel } from '../../types/api'

export type TriState = 'all' | 'true' | 'false'

export interface XarmFilterState {
  /** 'null' = 미판정 */
  alarm: TriState | 'null'
  confirmed: TriState
  label: '' | TruthLabel
  condition: string
  run_id: string
  model_profile: string
  source_group: string
  /** `datetime-local` 값 (브라우저 로컬 시간) */
  from: string
  to: string
}

export const EMPTY_FILTERS: XarmFilterState = {
  alarm: 'all',
  confirmed: 'all',
  label: '',
  condition: '',
  run_id: '',
  model_profile: '',
  source_group: '',
  from: '',
  to: '',
}

export const TRUTH_LABELS: TruthLabel[] = [
  'normal',
  'A121',
  'B82',
  'C182',
  'D',
  'E',
  'F',
  'foam_contact',
  'station_disturbance',
]

export const PAGE_LIMITS = [25, 50, 100, 250] as const

export type BuiltQuery = { query: CyclesQuery; error?: undefined } | { query?: undefined; error: string }

/** 로컬 `datetime-local` 값을 시간대가 포함된 ISO 8601(UTC)로 바꾼다. */
function toIsoUtc(local: string): string | null {
  const t = new Date(local)
  return Number.isNaN(t.getTime()) ? null : t.toISOString()
}

/**
 * 필터 상태 → API 쿼리. API가 지원하는 필터만 만들며, 빈 값은 생략한다(전체).
 * 잘못된 날짜 등은 정상 빈 결과로 바꾸지 않고 오류로 반환한다.
 */
export function buildCyclesQuery(f: XarmFilterState, offset: number, limit: number): BuiltQuery {
  const query: CyclesQuery = { limit, offset }
  if (f.alarm !== 'all') query.alarm = f.alarm === 'null' ? null : f.alarm === 'true'
  if (f.confirmed !== 'all') query.confirmed = f.confirmed === 'true'
  if (f.label) query.label = f.label
  for (const key of ['condition', 'run_id', 'model_profile', 'source_group'] as const) {
    const v = f[key].trim()
    if (v) query[key] = v
  }
  if (f.from) {
    const iso = toIsoUtc(f.from)
    if (!iso) return { error: '시작 시각이 올바르지 않습니다.' }
    query.from_utc = iso
  }
  if (f.to) {
    const iso = toIsoUtc(f.to)
    if (!iso) return { error: '종료 시각이 올바르지 않습니다.' }
    query.to_utc = iso
  }
  if (query.from_utc && query.to_utc && query.from_utc > query.to_utc) {
    return { error: '시작 시각이 종료 시각보다 늦습니다.' }
  }
  return { query }
}
