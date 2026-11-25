import type { MetricsQuery } from '../../types/api'
import { buildCyclesQuery, type XarmFilterState } from './historyFilters'

export type { XarmFilterState }

export interface MetricsScope {
  query?: MetricsQuery
  error?: string
  /** 화면에 표시할 적용 범위 문구 (비어 있으면 서버 전체 범위) */
  parts: string[]
  /** 경보 결과(예측)로 거른 집합이면 true — 전체 FPR·탐지율이 아닌 조건부 집계 */
  conditional: boolean
}

const ALARM_TEXT = { true: '이상 경보', false: '미경보', null: '미판정' } as const

/** `/metrics` 평가 범위 필터. History 필터와 같은 의미를 쓰며 limit/offset 은 제거한다. */
export function buildMetricsScope(f: XarmFilterState): MetricsScope {
  const built = buildCyclesQuery(f, 0, 1)
  if (built.error !== undefined) return { error: built.error, parts: [], conditional: false }
  const { limit: _l, offset: _o, ...query } = built.query
  void _l
  void _o
  const parts: string[] = []
  if (query.run_id) parts.push(`세션 ${query.run_id}`)
  if (query.source_group) parts.push(`출처 ${query.source_group}`)
  if (query.model_profile) parts.push(`모델 프로필 ${query.model_profile}`)
  if (query.condition) parts.push(`계획 조건 ${query.condition}`)
  if (query.confirmed !== undefined) parts.push(query.confirmed ? '확인된 회차만' : '미확정 회차만')
  if (query.label) parts.push(`실제 라벨 ${query.label}`)
  if (query.from_utc || query.to_utc) parts.push(`기간 ${query.from_utc ?? '처음'} ~ ${query.to_utc ?? '현재'}`)
  const conditional = 'alarm' in query
  if (conditional) parts.push(`경보 결과 ${ALARM_TEXT[String(query.alarm) as keyof typeof ALARM_TEXT]}`)
  return { query, parts, conditional }
}
