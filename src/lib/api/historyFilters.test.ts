import { describe, expect, it } from 'vitest'
import { buildCyclesQuery, EMPTY_FILTERS } from './historyFilters'

describe('buildCyclesQuery', () => {
  it('기본값은 페이지 인자만', () => {
    expect(buildCyclesQuery(EMPTY_FILTERS, 0, 25)).toEqual({ query: { limit: 25, offset: 0 } })
  })
  it('alarm 3상태를 true/false/null 로 구분', () => {
    expect(buildCyclesQuery({ ...EMPTY_FILTERS, alarm: 'true' }, 0, 25).query?.alarm).toBe(true)
    expect(buildCyclesQuery({ ...EMPTY_FILTERS, alarm: 'false' }, 0, 25).query?.alarm).toBe(false)
    expect(buildCyclesQuery({ ...EMPTY_FILTERS, alarm: 'null' }, 0, 25).query?.alarm).toBeNull()
  })
  it('confirmed + label 조합과 공백 제거', () => {
    const q = buildCyclesQuery({ ...EMPTY_FILTERS, confirmed: 'true', label: 'normal', run_id: ' r1 ' }, 50, 25).query
    expect(q).toMatchObject({ confirmed: true, label: 'normal', run_id: 'r1', offset: 50 })
  })
  it('날짜는 시간대 포함 ISO(UTC)로 변환', () => {
    const q = buildCyclesQuery({ ...EMPTY_FILTERS, from: '2026-11-25T10:00' }, 0, 25).query
    expect(q?.from_utc).toMatch(/Z$/)
  })
  it('잘못된 날짜·역전된 범위는 오류', () => {
    expect(buildCyclesQuery({ ...EMPTY_FILTERS, from: 'abc' }, 0, 25).error).toBeTruthy()
    expect(
      buildCyclesQuery({ ...EMPTY_FILTERS, from: '2026-11-25T10:00', to: '2026-11-24T10:00' }, 0, 25).error,
    ).toBeTruthy()
  })
})
