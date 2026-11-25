import { describe, expect, it } from 'vitest'
import { ApiSchemaError, validateCyclesPage, validateStatus } from './validate'

const cycle = (over: Record<string, unknown> = {}) => ({
  id: 'c1',
  freshness: { status: 'active' },
  detectors: { combined: { alarm: null } },
  ...over,
})

describe('validateStatus', () => {
  const ok = { schema_version: '1', server_time_utc: '2026-01-01T00:00:00Z', mode: 'no_data', latest: null }
  it('no_data + latest=null 은 정상 응답', () => {
    expect(validateStatus(ok).latest).toBeNull()
  })
  it('필수 필드 누락/잘못된 mode 거부', () => {
    expect(() => validateStatus({ ...ok, schema_version: undefined })).toThrow(ApiSchemaError)
    expect(() => validateStatus({ ...ok, mode: 'running' })).toThrow(ApiSchemaError)
    expect(() => validateStatus(null)).toThrow(ApiSchemaError)
  })
  it('alarm 이 문자열이면 거부 (truthiness 변환 금지)', () => {
    const bad = { ...ok, mode: 'live', latest: cycle({ detectors: { combined: { alarm: 'false' } } }) }
    expect(() => validateStatus(bad)).toThrow(/alarm/)
  })
  it('alarm null 은 보존', () => {
    const r = validateStatus({ ...ok, mode: 'live', latest: cycle() })
    expect(r.latest?.detectors?.combined?.alarm).toBeNull()
  })
})

describe('validateCyclesPage', () => {
  it('정상 페이지', () => {
    const p = validateCyclesPage({ items: [cycle()], total: 1, limit: 25, offset: 0 })
    expect(p.total).toBe(1)
  })
  it('잘못된 구조 거부', () => {
    expect(() => validateCyclesPage({ items: [], total: '0', limit: 25, offset: 0 })).toThrow(ApiSchemaError)
    expect(() => validateCyclesPage({ items: {}, total: 0, limit: 25, offset: 0 })).toThrow(ApiSchemaError)
    expect(() => validateCyclesPage({ items: [{ freshness: { status: 'active' } }], total: 1, limit: 25, offset: 0 })).toThrow(/id/)
  })
})
