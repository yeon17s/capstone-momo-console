import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Client } from './client'
import type { ConnectionState } from '../../types/api'

class FakeEventSource {
  static last: FakeEventSource | null = null
  readyState = 0
  closed = false
  onopen: (() => void) | null = null
  onerror: (() => void) | null = null
  private listeners = new Map<string, ((e: MessageEvent) => void)[]>()
  url: string
  constructor(url: string) {
    this.url = url
    FakeEventSource.last = this
  }
  addEventListener(type: string, fn: (e: MessageEvent) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn])
  }
  close() {
    this.closed = true
    this.readyState = 2
  }
  open() {
    this.readyState = 1
    this.onopen?.()
  }
  emit(type: string, data: unknown, id = '') {
    const ev = { data: JSON.stringify(data), lastEventId: id } as MessageEvent
    this.listeners.get(type)?.forEach((fn) => fn(ev))
  }
}

const STATUS = { schema_version: '1', server_time_utc: 't', mode: 'no_data', latest: null }
const PAGE = { items: [], total: 0, limit: 25, offset: 0 }

function setup(opts: { sse?: boolean } = {}) {
  const state = { failStatus: false, counts: { status: 0, cycles: 0, models: 0 } }
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const json = (b: unknown) => new Response(JSON.stringify(b), { status: 200 })
    if (url.includes('/status')) {
      state.counts.status++
      return state.failStatus ? new Response('x', { status: 503 }) : json(STATUS)
    }
    if (url.includes('/cycles')) {
      state.counts.cycles++
      return json(PAGE)
    }
    state.counts.models++
    return json({})
  }) as unknown as typeof fetch
  const conns: ConnectionState[] = []
  const onStatus = vi.fn()
  const onError = vi.fn()
  const client = new Client({
    fetchImpl,
    EventSourceImpl: opts.sse === false ? null : (FakeEventSource as never),
    onStatus,
    onError,
    onConnection: (s) => conns.push(s),
    pollMs: 5000,
  })
  return { client, state, conns, onStatus, onError }
}

const flush = () => vi.advanceTimersByTimeAsync(0)

beforeEach(() => {
  vi.useFakeTimers()
  FakeEventSource.last = null
})
afterEach(() => vi.useRealTimers())

describe('Client SSE', () => {
  it('connecting → connected, 초기 REST 조회 후 스트림 연결', async () => {
    const { client, conns, state } = setup()
    await client.start()
    FakeEventSource.last!.open()
    expect(conns).toEqual(['connecting', 'connected'])
    expect(state.counts).toEqual({ status: 1, cycles: 1, models: 1 })
    client.stop()
  })

  it('연속 cursor 는 즉시 렌더링하고 재조회하지 않는다', async () => {
    const { client, state, onStatus } = setup()
    await client.start()
    const es = FakeEventSource.last!
    es.open()
    onStatus.mockClear()
    es.emit('status', STATUS, 'a:1')
    es.emit('status', STATUS, 'a:2')
    expect(onStatus).toHaveBeenCalledTimes(2)
    expect(state.counts.status).toBe(1)
    client.stop()
  })

  it('duplicate cursor 는 무시', async () => {
    const { client, onStatus } = setup()
    await client.start()
    const es = FakeEventSource.last!
    es.emit('status', STATUS, 'a:1')
    onStatus.mockClear()
    es.emit('status', STATUS, 'a:1')
    expect(onStatus).not.toHaveBeenCalled()
    client.stop()
  })

  it.each([
    ['gap', 'a:1', 'a:5'],
    ['restart', 'a:1', 'b:1'],
    ['rewind', 'a:5', 'a:2'],
  ])('%s 이면 status 와 History 를 다시 조회', async (_name, first, second) => {
    const { client, state } = setup()
    await client.start()
    const es = FakeEventSource.last!
    es.emit('status', STATUS, first)
    await flush()
    const before = { ...state.counts }
    es.emit('status', STATUS, second)
    await flush()
    expect(state.counts.status).toBe(before.status + 1)
    expect(state.counts.cycles).toBeGreaterThan(before.cycles)
    client.stop()
  })

  it('reset 이벤트는 cursor 를 비우고 재조회', async () => {
    const { client, state } = setup()
    await client.start()
    const es = FakeEventSource.last!
    es.emit('status', STATUS, 'a:1')
    await flush()
    const before = state.counts.status
    es.emit('reset', { reason: 'gap', cursor: 'a:9' })
    await flush()
    expect(state.counts.status).toBe(before + 1)
    expect(client.cursor).toBeNull()
    client.stop()
  })

  it('끊김 → reconnecting, 재연결 시 전체 재조회', async () => {
    const { client, conns, state } = setup()
    await client.start()
    const es = FakeEventSource.last!
    es.open()
    es.readyState = 0
    es.onerror?.()
    expect(conns.at(-1)).toBe('reconnecting')
    const before = state.counts.status
    es.open()
    await flush()
    expect(conns.at(-1)).toBe('connected')
    expect(state.counts.status).toBe(before + 1)
    client.stop()
  })

  it('형식이 잘못된 SSE 페이로드는 오류로 보고하고 재조회', async () => {
    const { client, onError, state } = setup()
    await client.start()
    const before = state.counts.status
    FakeEventSource.last!.emit('status', { mode: 'bogus' }, 'a:1')
    await flush()
    expect(onError).toHaveBeenCalled()
    expect(state.counts.status).toBe(before + 1)
    client.stop()
  })

  it('SSE 가 열려 있으면 polling 실패만으로 offline 이 되지 않는다', async () => {
    const { client, conns, state, onError } = setup()
    await client.start()
    FakeEventSource.last!.open()
    state.failStatus = true
    await vi.advanceTimersByTimeAsync(5000)
    expect(conns).not.toContain('offline')
    expect(onError).toHaveBeenCalled()
    client.stop()
  })

  it('stop 은 스트림을 닫고 closed 를 알린다', async () => {
    const { client, conns } = setup()
    await client.start()
    const es = FakeEventSource.last!
    client.stop()
    expect(es.closed).toBe(true)
    expect(conns.at(-1)).toBe('closed')
  })
})

describe('Client polling fallback (EventSource 미지원)', () => {
  it('polling 상태, 실패 시 offline, 성공하면 polling 으로 복구', async () => {
    const { client, conns, state } = setup({ sse: false })
    await client.start()
    expect(conns.at(-1)).toBe('polling')
    state.failStatus = true
    await vi.advanceTimersByTimeAsync(5000)
    expect(conns.at(-1)).toBe('offline')
    state.failStatus = false
    await vi.advanceTimersByTimeAsync(5000)
    expect(conns.at(-1)).toBe('polling')
    client.stop()
  })
})
