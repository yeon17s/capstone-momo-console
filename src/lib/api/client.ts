/**
 * xArm 읽기 전용 API 클라이언트 (docs/momo-api.js 의 TypeScript 이식).
 * GET/HEAD 만 사용한다. 모델 추론·로봇 제어·mutation 요청은 보내지 않는다.
 */
import type {
  ConnectionState,
  CsvInfo,
  CyclesPage,
  CyclesQuery,
  HealthResponse,
  MetricsQuery,
  MetricsResponse,
  ModelsResponse,
  SeriesQuery,
  SeriesResponse,
  StatusResponse,
  TrendsQuery,
  TrendsResponse,
} from '../../types/api'
import { cursorTransition } from './labels'
import { validateCyclesPage, validateModels, validateStatus } from './validate'

type FetchImpl = typeof fetch
type EventSourceCtor = new (url: string) => EventSource

export interface ClientOptions {
  /** 같은 출처면 '' (기본). 별도 서버면 http://host:port */
  baseURL?: string
  fetchImpl?: FetchImpl
  /** null 을 주면 EventSource 를 쓰지 않고 polling 만 한다. */
  EventSourceImpl?: EventSourceCtor | null
  onStatus?: (status: StatusResponse) => void
  onCycles?: (page: CyclesPage) => void
  onModels?: (models: ModelsResponse) => void
  onConnection?: (state: ConnectionState) => void
  onError?: (error: Error) => void
  onRefreshRequired?: (reason: string) => void
  pollMs?: number
  historyRefreshMs?: number
  timeoutMs?: number
  historyQuery?: CyclesQuery
}

type QueryValue = string | number | boolean | null | undefined
type QueryRecord = Record<string, QueryValue | readonly string[]>

const PREFIX = '/api/v1'

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error))
}

/**
 * History 재조회 여부를 결정하는 지문.
 * 센서 샘플·age·동작 중 GRU 최대 점수는 포함하지 않아 History 가 5Hz 조회가 되지 않게 한다.
 */
export function historyRevision(status: StatusResponse | null | undefined): string | null {
  const r = status?.latest
  if (!r) return null
  const d = r.detectors ?? {}
  const a = r.auxiliary ?? {}
  const o = r.operator ?? {}
  return JSON.stringify([
    r.id,
    r.cycle?.phase,
    r.model_profile,
    d.catboost?.alarm,
    d.catboost?.score,
    d.gru?.alarm,
    d.combined?.alarm,
    d.combined?.type,
    a.estimate_status,
    a.estimated_type,
    o.confirmed,
    o.label,
    o.outcome,
    r.quality?.error,
  ])
}

export class Client {
  baseURL: string
  historyQuery: CyclesQuery
  cursor: string | null = null
  closed = true

  private readonly fetchImpl: FetchImpl
  private readonly EventSourceImpl: EventSourceCtor | null
  private readonly onStatus: (s: StatusResponse) => void
  private readonly onCycles: (p: CyclesPage) => void
  private readonly onModels: (m: ModelsResponse) => void
  private readonly onConnection: (s: ConnectionState) => void
  private readonly onError: (e: Error) => void
  private readonly onRefreshRequired: (reason: string) => void
  private readonly pollMs: number
  private readonly historyRefreshMs: number
  private readonly timeoutMs: number

  private opened = false
  private stream: EventSource | null = null
  private pollTimer: ReturnType<typeof setInterval> | null = null
  private pollInFlight = false
  private readonly controllers = new Set<AbortController>()
  private refreshPromise: Promise<unknown> | null = null
  private historyTimer: ReturnType<typeof setTimeout> | null = null
  private lastHistoryAt = 0
  private historyVersion = 0
  private statusVersion = 0
  private lastRevision: string | null | undefined = undefined

  constructor(options: ClientOptions = {}) {
    this.baseURL = (options.baseURL ?? '').replace(/\/$/, '')
    const f = options.fetchImpl ?? globalThis.fetch?.bind(globalThis)
    if (typeof f !== 'function') throw new Error('fetch is required')
    this.fetchImpl = f
    this.EventSourceImpl =
      options.EventSourceImpl === undefined
        ? ((globalThis as { EventSource?: EventSourceCtor }).EventSource ?? null)
        : options.EventSourceImpl
    this.onStatus = options.onStatus ?? (() => {})
    this.onCycles = options.onCycles ?? (() => {})
    this.onModels = options.onModels ?? (() => {})
    this.onConnection = options.onConnection ?? (() => {})
    this.onError = options.onError ?? (() => {})
    this.onRefreshRequired = options.onRefreshRequired ?? (() => {})
    this.pollMs = options.pollMs ?? 5000
    this.historyRefreshMs = options.historyRefreshMs ?? 3000
    this.timeoutMs = options.timeoutMs ?? 10000
    this.historyQuery = { limit: 25, offset: 0, ...(options.historyQuery ?? {}) }
  }

  // ── 요청 ──────────────────────────────────────────────────────────────
  url(path: string, query: QueryRecord = {}): string {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === '') continue
      params.set(key, value === null ? 'null' : Array.isArray(value) ? value.join(',') : String(value))
    }
    const qs = params.toString()
    return this.baseURL + PREFIX + path + (qs ? '?' + qs : '')
  }

  private async withAbort<T>(run: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController()
    this.controllers.add(controller)
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      return await run(controller.signal)
    } finally {
      clearTimeout(timer)
      this.controllers.delete(controller)
    }
  }

  async get<T = unknown>(path: string, query: QueryRecord = {}): Promise<T> {
    return this.withAbort(async (signal) => {
      const response = await this.fetchImpl(this.url(path, query), {
        method: 'GET',
        cache: 'no-store',
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        signal,
      })
      if (!response.ok) throw new Error(`API HTTP ${response.status}: ${path}`)
      return (await response.json()) as T
    })
  }

  health() {
    return this.get<HealthResponse>('/health')
  }
  async status(): Promise<StatusResponse> {
    return validateStatus(await this.get('/status'))
  }
  async models(): Promise<ModelsResponse> {
    return validateModels(await this.get('/models'))
  }
  async listCycles(query: CyclesQuery = this.historyQuery): Promise<CyclesPage> {
    return validateCyclesPage(await this.get('/cycles', query as QueryRecord))
  }
  cycle(id: string) {
    return this.get('/cycles/' + encodeURIComponent(id))
  }
  series(id: string, query: SeriesQuery = {}) {
    return this.get<SeriesResponse>('/cycles/' + encodeURIComponent(id) + '/series', query as QueryRecord)
  }
  metrics(query: MetricsQuery = {}) {
    return this.get<MetricsResponse>('/metrics', query as QueryRecord)
  }
  trends(query: TrendsQuery = {}) {
    return this.get<TrendsResponse>('/trends', query as QueryRecord)
  }

  // ── CSV ───────────────────────────────────────────────────────────────
  /** 같은 필터 전체. limit/offset 은 제거한다. */
  csvURL(query: CyclesQuery = this.historyQuery): string {
    const { limit: _limit, offset: _offset, ...filters } = query
    void _limit
    void _offset
    return this.url('/cycles.csv', filters as QueryRecord)
  }

  async csvInfo(query: CyclesQuery = this.historyQuery): Promise<CsvInfo> {
    const url = this.csvURL(query)
    return this.withAbort(async (signal) => {
      const response = await this.fetchImpl(url, {
        method: 'HEAD',
        cache: 'no-store',
        credentials: 'same-origin',
        signal,
      })
      if (!response.ok) throw new Error('CSV HTTP ' + response.status)
      const total = response.headers.get('X-Export-Total')
      const rows = response.headers.get('X-Export-Rows')
      const truncated = response.headers.get('X-Export-Truncated')
      if (!/^\d+$/.test(total ?? '') || !/^\d+$/.test(rows ?? '') || !['true', 'false'].includes(truncated ?? '')) {
        throw new Error('CSV export limits unavailable; do not assume a complete export')
      }
      return { url, total: Number(total), rows: Number(rows), truncated: truncated === 'true' }
    })
  }

  // ── History ───────────────────────────────────────────────────────────
  setHistoryQuery(query: CyclesQuery) {
    this.historyQuery = { limit: 25, offset: 0, ...query }
    return this.refreshHistory()
  }

  async refreshHistory(): Promise<CyclesPage> {
    const version = ++this.historyVersion
    const result = await this.listCycles({ ...this.historyQuery })
    if (!this.closed && version === this.historyVersion) {
      this.lastHistoryAt = Date.now()
      this.onCycles(result)
    }
    return result
  }

  // ── 상태 전달 ─────────────────────────────────────────────────────────
  private deliverStatus(result: StatusResponse, scheduleHistory = true) {
    const revision = historyRevision(result)
    const changed = revision !== this.lastRevision
    this.lastRevision = revision
    this.onStatus(result) // 현재 카드는 즉시 렌더링한다. History 타이머를 적용하지 않는다.
    if (scheduleHistory) this.scheduleHistory(changed)
  }

  private async readStatus(scheduleHistory = true) {
    const version = ++this.statusVersion
    const result = await this.status()
    if (!this.closed && version === this.statusVersion) this.deliverStatus(result, scheduleHistory)
    return result
  }

  refresh(reason = 'manual', includeModels = false): Promise<unknown> {
    if (this.refreshPromise) return this.refreshPromise
    this.onRefreshRequired(reason)
    this.refreshPromise = Promise.all([
      this.readStatus(false),
      this.refreshHistory(),
      ...(includeModels
        ? [
            this.models().then((value) => {
              if (!this.closed) this.onModels(value)
              return value
            }),
          ]
        : []),
    ]).finally(() => {
      this.refreshPromise = null
    })
    return this.refreshPromise
  }

  private scheduleHistory(immediate = false) {
    if (this.closed) return
    if (this.historyTimer !== null) {
      if (!immediate) return
      clearTimeout(this.historyTimer)
    }
    const delay = immediate ? 0 : Math.max(0, this.historyRefreshMs - (Date.now() - this.lastHistoryAt))
    this.historyTimer = setTimeout(() => {
      this.historyTimer = null
      if (!this.closed) this.refreshHistory().catch((e) => this.onError(toError(e)))
    }, delay)
  }

  // ── SSE ───────────────────────────────────────────────────────────────
  private streamStatus(event: MessageEvent) {
    if (this.closed) return
    try {
      const next = event.lastEventId
      const transition = cursorTransition(this.cursor, next)
      if (transition === 'duplicate') return
      const payload = validateStatus(JSON.parse(event.data))
      ++this.statusVersion // 진행 중이던 이전 REST 응답이 SSE 상태를 덮어쓰지 않게 한다.
      this.deliverStatus(payload)
      if (transition !== 'invalid') this.cursor = next
      if (transition === 'gap' || transition === 'restart' || transition === 'rewind' || transition === 'invalid') {
        this.refresh('SSE_' + transition).catch((e) => this.onError(toError(e)))
      }
    } catch (error) {
      this.onError(toError(error))
      this.refresh('SSE_parse_error').catch((e) => this.onError(toError(e)))
    }
  }

  async start(): Promise<void> {
    if (!this.closed) return
    this.closed = false
    this.opened = false
    this.cursor = null
    this.lastRevision = undefined
    this.onConnection('connecting')
    await this.refresh('initial', true).catch((e) => this.onError(toError(e)))
    if (this.closed) return
    if (this.EventSourceImpl) {
      const stream = new this.EventSourceImpl(this.url('/events'))
      this.stream = stream
      stream.addEventListener('status', (e) => this.streamStatus(e as MessageEvent))
      stream.addEventListener('reset', () => {
        if (this.closed) return
        this.cursor = null
        this.refresh('SSE_reset').catch((e) => this.onError(toError(e)))
      })
      stream.onopen = () => {
        if (this.closed) return
        this.onConnection('connected')
        if (this.opened) this.refresh('SSE_reconnect').catch((e) => this.onError(toError(e)))
        this.opened = true
      }
      // 네이티브 EventSource 는 Last-Event-ID 를 유지한 채 재연결한다. 기존 숫자는 '마지막 관측값'으로 남긴다.
      stream.onerror = () => {
        if (!this.closed) this.onConnection('reconnecting')
      }
    } else {
      this.onConnection('polling')
    }
    // SSE 연결 중의 polling 은 복구용 재조회이며, EventSource 미지원 환경에서는 상태 갱신 주기다.
    this.pollTimer = setInterval(() => {
      if (this.pollInFlight) return
      this.pollInFlight = true
      this.readStatus()
        .catch((error) => {
          if (!this.closed) {
            this.onConnection('offline')
            this.onError(toError(error))
          }
        })
        .finally(() => {
          this.pollInFlight = false
        })
    }, this.pollMs)
  }

  /** 클라이언트 종료. 로봇 정지 명령이 아니다. */
  stop(): void {
    this.closed = true
    ++this.historyVersion
    ++this.statusVersion
    this.stream?.close()
    this.stream = null
    if (this.pollTimer !== null) clearInterval(this.pollTimer)
    this.pollTimer = null
    if (this.historyTimer !== null) clearTimeout(this.historyTimer)
    this.historyTimer = null
    for (const controller of this.controllers) controller.abort()
    this.onConnection('closed')
  }
}
