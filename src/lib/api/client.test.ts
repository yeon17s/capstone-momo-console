import { describe, expect, it, vi } from 'vitest'
import { Client, historyRevision } from './client'
import type { StatusResponse } from '../../types/api'

function fakeFetch(handler: (url: string, init?: RequestInit) => Response) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init)) as unknown as typeof fetch
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('Client.url', () => {
  const c = new Client({ fetchImpl: fakeFetch(() => json({})), EventSourceImpl: null })
  it('prefix, null→"null", false 유지, 빈 값 제외', () => {
    expect(c.url('/cycles', { alarm: null, confirmed: false, label: undefined, run_id: '' })).toBe(
      '/api/v1/cycles?alarm=null&confirmed=false',
    )
  })
  it('channels 배열은 쉼표로 연결', () => {
    expect(c.url('/x', { channels: ['ina', 'adxl'] })).toBe('/api/v1/x?channels=ina%2Cadxl')
  })
  it('ID 는 URL 인코딩', async () => {
    const f = fakeFetch(() => json({}))
    await new Client({ fetchImpl: f, EventSourceImpl: null }).cycle('a/b c')
    expect((f as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0]).toBe('/api/v1/cycles/a%2Fb%20c')
  })
})

describe('Client.csvURL / csvInfo', () => {
  const headers = (h: Record<string, string>) => new Response(null, { status: 200, headers: h })
  it('limit/offset 을 제거하고 필터는 유지', () => {
    const c = new Client({ fetchImpl: fakeFetch(() => json({})), EventSourceImpl: null })
    expect(c.csvURL({ label: 'normal', confirmed: true, limit: 25, offset: 50 })).toBe(
      '/api/v1/cycles.csv?label=normal&confirmed=true',
    )
  })
  it('HEAD 헤더를 읽어 잘림 여부 반환', async () => {
    const f = fakeFetch((_u, init) => {
      expect(init?.method).toBe('HEAD')
      return headers({ 'X-Export-Total': '120000', 'X-Export-Rows': '100000', 'X-Export-Truncated': 'true' })
    })
    const info = await new Client({ fetchImpl: f, EventSourceImpl: null }).csvInfo({})
    expect(info).toMatchObject({ total: 120000, rows: 100000, truncated: true })
  })
  it('헤더가 없으면 전체 내보내기로 가정하지 않고 오류', async () => {
    const f = fakeFetch(() => headers({}))
    await expect(new Client({ fetchImpl: f, EventSourceImpl: null }).csvInfo({})).rejects.toThrow(/do not assume/)
  })
  it('HTTP 오류는 오류', async () => {
    const f = fakeFetch(() => new Response(null, { status: 500 }))
    await expect(new Client({ fetchImpl: f, EventSourceImpl: null }).csvInfo({})).rejects.toThrow(/500/)
  })
})

describe('Client.get 오류', () => {
  it('4xx/5xx 는 정상 빈 데이터가 아니라 예외', async () => {
    const f = fakeFetch(() => json({ detail: 'bad' }, 422))
    await expect(new Client({ fetchImpl: f, EventSourceImpl: null }).listCycles({ limit: 9999 })).rejects.toThrow(/422/)
  })
})

describe('historyRevision', () => {
  const base = (over: Record<string, unknown> = {}): StatusResponse =>
    ({
      schema_version: '1',
      server_time_utc: 't',
      mode: 'live',
      latest: {
        id: 'c1',
        freshness: { status: 'active' },
        sensors: { ina: { current_A: 1 } },
        detectors: { combined: { alarm: false, type: 'no_alarm' }, gru: { score: 1, alarm: false } },
        ...over,
      },
    }) as StatusResponse

  it('센서 값·GRU 점수만 바뀌면 지문이 같다 (History 5Hz 방지)', () => {
    const a = historyRevision(base())
    const b = historyRevision(
      base({ sensors: { ina: { current_A: 9 } }, detectors: { combined: { alarm: false, type: 'no_alarm' }, gru: { score: 5, alarm: false } } }),
    )
    expect(a).toBe(b)
  })
  it('경보·회차·확인 라벨이 바뀌면 지문이 달라진다', () => {
    const a = historyRevision(base())
    expect(historyRevision(base({ detectors: { combined: { alarm: true, type: 'A121' } } }))).not.toBe(a)
    expect(historyRevision(base({ id: 'c2' }))).not.toBe(a)
    expect(historyRevision(base({ operator: { confirmed: true, label: 'normal' } }))).not.toBe(a)
  })
  it('latest 없으면 null', () => {
    expect(historyRevision({ ...base(), latest: null })).toBeNull()
  })
})
