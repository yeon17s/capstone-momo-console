import { describe, expect, it } from 'vitest'
import { EMPTY_FILTERS } from './historyFilters'
import { buildMetricsScope } from './metricsScope'

describe('buildMetricsScope', () => {
  it('필터 없음 = 서버 전체 범위, 조건부 아님', () => {
    const s = buildMetricsScope(EMPTY_FILTERS)
    expect(s.query).toEqual({})
    expect(s.parts).toEqual([])
    expect(s.conditional).toBe(false)
  })
  it('limit/offset 은 metrics 쿼리에 넣지 않는다', () => {
    const s = buildMetricsScope({ ...EMPTY_FILTERS, run_id: 'r1' })
    expect(s.query).toEqual({ run_id: 'r1' })
    expect(s.parts).toEqual(['세션 r1'])
  })
  it('경보 결과 필터는 조건부 집계로 표시 (alarm=null 도 포함)', () => {
    expect(buildMetricsScope({ ...EMPTY_FILTERS, alarm: 'true' }).conditional).toBe(true)
    const s = buildMetricsScope({ ...EMPTY_FILTERS, alarm: 'null' })
    expect(s.conditional).toBe(true)
    expect(s.parts).toContain('경보 결과 미판정')
  })
  it('잘못된 날짜는 오류', () => {
    expect(buildMetricsScope({ ...EMPTY_FILTERS, from: 'x' }).error).toBeTruthy()
  })
})
