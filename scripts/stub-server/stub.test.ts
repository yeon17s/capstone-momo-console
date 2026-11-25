// stub 서버를 띄워 실제 HTTP/SSE 전송으로 Client·검증 로직을 확인한다(합성 데이터, 브라우저 아님).
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Client } from '../../src/lib/api/client'
import { validateCyclesPage, validateStatus } from '../../src/lib/api/validate'
import type { ConnectionState, CyclesPage } from '../../src/types/api'
// @ts-expect-error 타입 선언이 없는 개발용 .mjs 모듈
import { createStubServer } from './server.mjs'

type Stub = ReturnType<typeof createStubServer>

/** fetch 스트림으로 구현한 최소 EventSource (Last-Event-ID 재접속 포함). */
class FetchEventSource {
  readyState = 0
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  private listeners = new Map<string, ((e: MessageEvent) => void)[]>()
  private abort = new AbortController()
  private lastId = ''
  private closed = false
  constructor(private url: string) {
    void this.loop()
  }
  addEventListener(type: string, fn: (e: MessageEvent) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn])
  }
  close() {
    this.closed = true
    this.readyState = 2
    this.abort.abort()
  }
  private async loop() {
    while (!this.closed) {
      try {
        const res = await fetch(this.url, {
          headers: this.lastId ? { 'Last-Event-ID': this.lastId } : {},
          signal: this.abort.signal,
        })
        if (!res.ok || !res.body) throw new Error('http ' + res.status)
        this.readyState = 1
        this.onopen?.()
        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let buf = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          let idx
          while ((idx = buf.indexOf('\n\n')) >= 0) {
            this.dispatch(buf.slice(0, idx))
            buf = buf.slice(idx + 2)
          }
        }
      } catch {
        if (this.closed) return
      }
      if (this.closed) return
      this.readyState = 0
      this.onerror?.()
      await new Promise((r) => setTimeout(r, 40))
    }
  }
  private dispatch(block: string) {
    let type = 'message'
    let data = ''
    for (const line of block.split('\n')) {
      if (line.startsWith(':')) continue
      if (line.startsWith('event:')) type = line.slice(6).trim()
      else if (line.startsWith('data:')) data += line.slice(5).trim()
      else if (line.startsWith('id:')) this.lastId = line.slice(3).trim()
    }
    const ev = { data, lastEventId: this.lastId } as MessageEvent
    this.listeners.get(type)?.forEach((fn) => fn(ev))
  }
}

async function waitFor(cond: () => boolean, ms = 3000) {
  const start = Date.now()
  while (!cond()) {
    if (Date.now() - start > ms) throw new Error('waitFor timeout')
    await new Promise((r) => setTimeout(r, 10))
  }
}

let stub: Stub
let base: string
const ctl = (path: string) => fetch(base + '/__stub/' + path).then((r) => r.json())

beforeEach(async () => {
  stub = createStubServer({ tickMs: 30 })
  const port = await stub.start(0)
  base = `http://127.0.0.1:${port}`
})
afterEach(async () => {
  await stub.stop()
})

const mk = (extra: Partial<ConstructorParameters<typeof Client>[0]> = {}) =>
  new Client({ baseURL: base, EventSourceImpl: FetchEventSource as never, pollMs: 60000, ...extra })

describe('stub 서버 + Client', () => {
  it('모든 회차 페이지가 응답 검증을 통과한다 (alarm 은 boolean|null)', async () => {
    const c = mk()
    const seen: unknown[] = []
    for (let offset = 0; ; offset += 25) {
      const page = await c.listCycles({ limit: 25, offset })
      validateCyclesPage(page)
      seen.push(...page.items)
      if (offset + 25 >= page.total) break
    }
    expect(seen).toHaveLength(60)
    const alarms = new Set(
      (seen as { detectors: { combined: { alarm: unknown } } }[]).map((x) => x.detectors.combined.alarm),
    )
    expect(alarms).toEqual(new Set([true, false, null]))
  })

  it('opaque id(":"·"/" 포함)로 상세·파형 조회가 된다', async () => {
    const c = mk()
    const page = await c.listCycles({ limit: 3 })
    for (const item of page.items) {
      expect(item.id).toContain('/')
      const detail = (await c.cycle(item.id)) as { id: string }
      expect(detail.id).toBe(item.id)
      const s = await c.series(item.id, { channels: ['ina', 'positions'], limit: 50 })
      expect(s.cycle_id).toBe(item.id)
      expect(s.truncated).toBe(true)
      expect(s.source_quality).toBeTruthy()
    }
  })

  it('지원 필터가 서버에서 적용된다', async () => {
    const c = mk()
    const unjudged = await c.listCycles({ alarm: null, limit: 250 })
    expect(unjudged.items.every((i) => i.detectors?.combined?.alarm === null)).toBe(true)
    expect(unjudged.total).toBeGreaterThan(0)
    const confirmedNormal = await c.listCycles({ confirmed: true, label: 'normal', limit: 250 })
    expect(confirmedNormal.items.every((i) => i.operator?.label === 'normal')).toBe(true)
    const past = await c.listCycles({ to_utc: '2000-01-01T00:00:00Z' })
    expect(past.total).toBe(0)
  })

  it('잘못된 요청은 빈 결과가 아니라 오류', async () => {
    const c = mk()
    await expect(c.listCycles({ limit: 999 })).rejects.toThrow(/422/)
    await expect(c.listCycles({ from_utc: '2026-11-25T00:00:00' })).rejects.toThrow(/422/) // 시간대 없음
    await expect(c.cycle('없는-id')).rejects.toThrow(/404/)
    const res = await fetch(base + '/api/v1/status', { method: 'POST' })
    expect(res.status).toBe(405)
  })

  it('CSV HEAD: 행 수·잘림 헤더 (limit 초과 시 truncated)', async () => {
    const c = mk()
    expect(await c.csvInfo({ limit: 25, offset: 25 })).toMatchObject({ total: 60, rows: 60, truncated: false })
    await ctl('set?csv_limit=10')
    expect(await c.csvInfo({})).toMatchObject({ total: 60, rows: 10, truncated: true })
    const bytes = new Uint8Array(await (await fetch((await c.csvInfo({ label: 'normal' })).url)).arrayBuffer())
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]) // UTF-8 BOM (fetch text()는 BOM을 제거하므로 바이트로 확인)
  })

  it('metrics: 분모 필드와 null 비율', async () => {
    const c = mk()
    const m = await c.metrics({ confirmed: false })
    expect(m.confirmed_total).toBe(0)
    expect((m as { normal_false_alarm_rate: unknown }).normal_false_alarm_rate).toBeNull()
  })

  it('no_data: latest=null 도 유효한 응답', async () => {
    await ctl('set?mode=no_data')
    const s = validateStatus(await mk().status())
    expect(s.mode).toBe('no_data')
    expect(s.latest).toBeNull()
  })

  it('실패 주입: 500 은 오류로 전달', async () => {
    await ctl('set?fail=cycles')
    await expect(mk().listCycles({})).rejects.toThrow(/500/)
  })
})

describe('stub SSE + Client', () => {
  it('start: 초기 조회 후 SSE 로 status 를 연속 수신, cursor 는 instance:seq', async () => {
    const statuses: string[] = []
    const conns: ConnectionState[] = []
    let cycles: CyclesPage | null = null
    const c = mk({
      onStatus: (s) => statuses.push(s.stream?.cursor ?? ''),
      onConnection: (s) => conns.push(s),
      onCycles: (p) => (cycles = p),
    })
    await c.start()
    await waitFor(() => statuses.length >= 4)
    c.stop()
    expect(conns).toContain('connected')
    expect(statuses.at(-1)).toMatch(/^stub1:\d+$/)
    expect(cycles).not.toBeNull()
  })

  it('cursor gap → status/History 재조회', async () => {
    const reasons: string[] = []
    const c = mk({ onRefreshRequired: (r) => reasons.push(r) })
    await c.start()
    await waitFor(() => c.cursor !== null)
    await ctl('skip?n=7')
    await waitFor(() => reasons.includes('SSE_gap'))
    c.stop()
  })

  it('서버 재시작 → 재접속 시 reset 을 받아 재조회하고 새 instance 를 따른다', async () => {
    const reasons: string[] = []
    const c = mk({ onRefreshRequired: (r) => reasons.push(r) })
    await c.start()
    await waitFor(() => c.cursor?.startsWith('stub1:') === true)
    await ctl('restart')
    await waitFor(() => c.cursor?.startsWith('stub2:') === true)
    expect(reasons.some((r) => r === 'SSE_reset' || r === 'SSE_reconnect' || r === 'SSE_restart')).toBe(true)
    c.stop()
  })

  it('SSE 끊김 → reconnecting → 재연결 후 connected', async () => {
    const conns: ConnectionState[] = []
    const c = mk({ onConnection: (s) => conns.push(s) })
    await c.start()
    await waitFor(() => conns.includes('connected'))
    await ctl('drop')
    await waitFor(() => conns.includes('reconnecting'))
    await waitFor(() => conns.filter((s) => s === 'connected').length >= 2)
    c.stop()
  })

  it('동시 SSE 8개 초과는 429', async () => {
    const controllers = Array.from({ length: 8 }, () => new AbortController())
    await Promise.all(controllers.map((a) => fetch(base + '/api/v1/events', { signal: a.signal })))
    const ninth = await fetch(base + '/api/v1/events')
    expect(ninth.status).toBe(429)
    controllers.forEach((a) => a.abort())
  })
})
