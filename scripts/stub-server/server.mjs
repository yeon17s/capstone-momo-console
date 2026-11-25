#!/usr/bin/env node
// xArm 읽기 전용 API(/api/v1) stub — UI 흐름 확인용 개발 도구.
// docs/API_CONTRACT.md 의 경로·필터·헤더·SSE 동작을 흉내 내며, 값은 합성이다(성능·실측 근거 아님).
// 실행: npm run stub   (환경변수: STUB_PORT=8787 STUB_MODE=live|history|no_data STUB_CSV_LIMIT=100000 STUB_TICK_MS=1000)
import http from 'node:http'
import { pathToFileURL } from 'node:url'
import {
  CB_THRESHOLD, CYCLES, GRU_THRESHOLD, TRUTH_LABELS, buildSeries, buildTrends, publicCycle,
} from './fixtures.mjs'

const PREFIX = '/api/v1'
const MAX_SSE = 8
const SERIES_CHANNELS = ['ina', 'adxl', 'positions', 'forecasts', 'residuals', 'alarms', 'publication']
const CYCLE_FILTERS = ['alarm', 'confirmed', 'label', 'condition', 'run_id', 'model_profile', 'source_group', 'from_utc', 'to_utc']

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status }
}

export function createStubServer(options = {}) {
  const opts = {
    mode: options.mode ?? 'live',
    freshness: options.freshness ?? null, // 'stale' 등 강제
    csvLimit: options.csvLimit ?? 100000,
    tickMs: options.tickMs ?? 1000,
    heartbeatMs: options.heartbeatMs ?? 15000,
    fail: options.fail ?? 'none',
  }
  let instance = 'stub1'
  let restarts = 1
  let seq = 0
  const clients = new Set()

  // ── 상태 ────────────────────────────────────────────────────────────
  function statusBody() {
    let latest = null
    if (opts.mode !== 'no_data') {
      latest = publicCycle(CYCLES[0])
      const tick = seq
      latest.sensors = structuredClone(latest.sensors)
      latest.sensors.ina.current_A = 1.1 + 0.2 * Math.sin(tick / 3)
      const stale = opts.freshness === 'stale'
      latest.freshness = opts.mode === 'live'
        ? { status: stale ? 'stale' : 'active', age_s: stale ? 42.5 : 0.2, reason: stale ? 'stub: 로그 갱신 없음' : 'stub: 로그 갱신 관찰' }
        : { status: 'historical', age_s: null, reason: 'stub: 저장된 기록' }
    }
    return {
      schema_version: '1',
      server_time_utc: new Date().toISOString(),
      mode: opts.mode,
      latest,
      indexer: { stub: true },
      stream: { cursor: `${instance}:${seq}` },
    }
  }

  // ── 쿼리 검증·필터 ────────────────────────────────────────────────────
  function parseIso(name, v) {
    if (!/(Z|[+-]\d{2}:?\d{2})$/.test(v)) throw new HttpError(422, `${name} must include a timezone`)
    const t = Date.parse(v)
    if (Number.isNaN(t)) throw new HttpError(422, `${name} is not a valid ISO 8601 time`)
    return t
  }
  const parseBool = (name, v) => {
    if (v !== 'true' && v !== 'false') throw new HttpError(422, `${name} must be true or false`)
    return v === 'true'
  }

  function filtersOf(q, extraAllowed = []) {
    const allowed = new Set([...CYCLE_FILTERS, ...extraAllowed])
    for (const k of q.keys()) if (!allowed.has(k)) throw new HttpError(422, `unknown query parameter: ${k}`)
    const f = {}
    if (q.has('alarm')) {
      const v = q.get('alarm')
      if (!['true', 'false', 'null'].includes(v)) throw new HttpError(422, 'alarm must be true, false or null')
      f.alarm = v === 'null' ? null : v === 'true'
    }
    if (q.has('confirmed')) f.confirmed = parseBool('confirmed', q.get('confirmed'))
    if (q.has('label')) {
      if (!TRUTH_LABELS.includes(q.get('label'))) throw new HttpError(422, 'unknown label')
      f.label = q.get('label')
    }
    for (const k of ['condition', 'run_id', 'model_profile', 'source_group']) if (q.has(k)) f[k] = q.get(k)
    if (q.has('from_utc')) f.from = parseIso('from_utc', q.get('from_utc'))
    if (q.has('to_utc')) f.to = parseIso('to_utc', q.get('to_utc'))
    return f
  }

  function matches(c, f) {
    if ('alarm' in f && c.detectors.combined.alarm !== f.alarm) return false
    if ('confirmed' in f && c.operator.confirmed !== f.confirmed) return false
    if ('label' in f && c.operator.label !== f.label) return false
    for (const k of ['condition', 'run_id', 'model_profile', 'source_group']) if (k in f && c[k] !== f[k]) return false
    if ('from' in f && c._stub.capturedMs < f.from) return false
    if ('to' in f && c._stub.capturedMs > f.to) return false
    return true
  }
  const filtered = (f) => CYCLES.filter((c) => matches(c, f)) // 이미 최신순

  const intParam = (q, name, def, min, max) => {
    if (!q.has(name)) return def
    const raw = q.get(name)
    const n = Number(raw)
    if (!/^-?\d+$/.test(raw) || n < min || n > max) throw new HttpError(422, `${name} must be an integer in ${min}..${max}`)
    return n
  }

  // ── 라우트 ────────────────────────────────────────────────────────────
  function metrics(f) {
    const rows = filtered(f)
    const confirmed = rows.filter((c) => c.operator.confirmed === true)
    const noMotion = confirmed.filter((c) => c.quality.phase_quality === 'no_motion')
    const eligible = confirmed.filter((c) => c.quality.phase_quality !== 'no_motion')
    const scored = eligible.filter((c) => c.detectors.combined.alarm !== null)
    const normal = scored.filter((c) => c.operator.label === 'normal')
    const anomaly = scored.filter((c) => c.operator.label !== 'normal')
    const rate = (n, d) => (d === 0 ? null : n / d)
    const byLabel = {}
    for (const c of anomaly) {
      const e = (byLabel[c.operator.label] ??= { scored: 0, detected: 0, detection_rate: null })
      e.scored++
      if (c.detectors.combined.alarm === true) e.detected++
    }
    for (const e of Object.values(byLabel)) e.detection_rate = rate(e.detected, e.scored)
    // 비율 필드 이름은 stub 임의 구성이다(실서버 응답 확인 전).
    return {
      confirmed_total: eligible.length,
      confirmed_scored: scored.length,
      confirmed_unavailable: eligible.length - scored.length,
      normal_scored: normal.length,
      anomaly_scored: anomaly.length,
      pending_or_unclassified_truth: rows.length - confirmed.length,
      excluded_no_motion: noMotion.length,
      normal_false_alarm_rate: rate(normal.filter((c) => c.detectors.combined.alarm === true).length, normal.length),
      detection_by_label: byLabel,
      scope: { filters_applied: Object.keys(f), stub: true },
    }
  }

  function seriesBody(c, q) {
    for (const k of q.keys()) if (!['limit', 'channels', 'from_s', 'to_s'].includes(k)) throw new HttpError(422, `unknown query parameter: ${k}`)
    const limit = intParam(q, 'limit', 2000, 1, 5000)
    let channels = SERIES_CHANNELS
    if (q.has('channels')) {
      channels = q.get('channels').split(',')
      const bad = channels.find((x) => !SERIES_CHANNELS.includes(x))
      if (bad) throw new HttpError(422, `unknown channel: ${bad}`)
    }
    const num = (n) => {
      if (!q.has(n)) return null
      const v = Number(q.get(n))
      if (!Number.isFinite(v)) throw new HttpError(422, `${n} must be a number`)
      return v
    }
    const from = num('from_s')
    const to = num('to_s')
    if (from !== null && to !== null && from > to) throw new HttpError(422, 'from_s must not exceed to_s')
    const all = buildSeries(c.cycle.index)
    const series = {}
    const sourceQuality = {}
    let truncated = false
    for (const ch of channels) {
      let rows = all[ch].filter((r) => (from === null || r.t_s >= from) && (to === null || r.t_s <= to))
      const observed = rows.length
      if (rows.length > limit) { rows = rows.slice(0, limit); truncated = true }
      series[ch] = rows
      sourceQuality[ch] = { observed, retained: rows.length }
    }
    return { cycle_id: c.id, series, limit, truncated, source_quality: sourceQuality }
  }

  const csvCell = (v) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  function csvBody(rows) {
    const head = ['id', 'captured_utc', 'run_id', 'condition', 'operator_confirmed', 'operator_label', 'combined_alarm', 'combined_type', 'auxiliary_type', 'model_profile']
    const lines = [head.join(',')]
    for (const c of rows) {
      lines.push([c.id, c.captured_utc, c.run_id, c.condition, c.operator.confirmed, c.operator.label, c.detectors.combined.alarm, c.detectors.combined.type, c.auxiliary.estimated_type, c.model_profile].map(csvCell).join(','))
    }
    return '﻿' + lines.join('\n') + '\n'
  }

  function route(req, url) {
    const q = url.searchParams
    const path = url.pathname.slice(PREFIX.length) || '/'
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent)
    const failIf = (name) => { if (opts.fail === name) throw new HttpError(500, `stub: forced failure on ${name}`) }

    if (path === '/health') return { json: { ok: true, stub: true } }
    if (path === '/status') { failIf('status'); return { json: statusBody() } }
    if (path === '/models') {
      failIf('models')
      return {
        json: {
          schema_version: '1',
          active_profile: 'stub_catboost_gru',
          models: {
            catboost: { name: 'CB4 (stub)', threshold: CB_THRESHOLD, rule: '1-P(normal) > threshold', evaluated_at: 'cycle_end' },
            gru: { name: 'GRU residual (stub)', threshold: GRU_THRESHOLD, pre_target_tolerance_ms: 5, confirm_window_ms: 650, distinct_exceedances: 2 },
          },
          detection_policy: { combine: 'OR', combined_score: null },
          auxiliary: { calibrated: false, classes: ['normal_like', 'A121', 'B82', 'C182', 'D', 'E', 'F', 'foam_contact', 'station_disturbance'] },
          historical_profiles: ['old_logistic_gru'],
        },
      }
    }
    if (path === '/cycles') {
      failIf('cycles')
      const f = filtersOf(new URLSearchParams([...q].filter(([k]) => k !== 'limit' && k !== 'offset')), [])
      const limit = intParam(q, 'limit', 25, 1, 250)
      const offset = intParam(q, 'offset', 0, 0, 1e9)
      const rows = filtered(f)
      return { json: { items: rows.slice(offset, offset + limit).map(publicCycle), total: rows.length, limit, offset } }
    }
    if (path === '/cycles.csv') {
      const f = filtersOf(q)
      const rows = filtered(f)
      const kept = rows.slice(0, opts.csvLimit)
      return {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="cycles.csv"',
          'X-Export-Total': String(rows.length),
          'X-Export-Rows': String(kept.length),
          'X-Export-Truncated': String(rows.length > kept.length),
          'Access-Control-Expose-Headers': 'X-Export-Total, X-Export-Rows, X-Export-Truncated',
        },
        body: csvBody(kept),
      }
    }
    if (path === '/metrics') return { json: metrics(filtersOf(q)) }
    if (path === '/trends') {
      const f = filtersOf(new URLSearchParams([...q].filter(([k]) => k !== 'limit')))
      const limit = intParam(q, 'limit', 500, 1, 2000)
      const runs = [...new Set(filtered(f).map((c) => c.run_id))]
      const all = runs.flatMap((r) => buildTrends(r)).sort((a, b) => a.captured_utc.localeCompare(b.captured_utc))
      return { json: { points: all.slice(0, limit), total: all.length, limit, truncated: all.length > limit } }
    }
    if (parts[0] === 'cycles' && parts[1]) {
      // 슬래시가 인코딩된 opaque id 를 허용하려고 첫 '/' 구분은 원본 경로로 다시 나눈다.
      const raw = url.pathname.slice(PREFIX.length + '/cycles/'.length).split('/')
      const isSeries = raw.length > 1 && raw[raw.length - 1] === 'series'
      const id = decodeURIComponent(isSeries ? raw.slice(0, -1).join('/') : raw.join('/'))
      const c = CYCLES.find((x) => x.id === id)
      if (!c) throw new HttpError(404, `cycle not found: ${id}`)
      if (isSeries) return { json: seriesBody(c, q) }
      if (q.size) throw new HttpError(422, 'unexpected query parameter')
      return { json: publicCycle(c) }
    }
    throw new HttpError(404, `no such endpoint: ${path}`)
  }

  // ── SSE ──────────────────────────────────────────────────────────────
  const send = (res, chunk) => { try { res.write(chunk) } catch { clients.delete(res) } }
  const statusEvent = () => `id: ${instance}:${seq}\nevent: status\ndata: ${JSON.stringify(statusBody())}\n\n`
  const resetEvent = (reason) => `event: reset\ndata: ${JSON.stringify({ reason, cursor: `${instance}:${seq}` })}\n\n`

  function openEvents(req, res) {
    if (clients.size >= MAX_SSE) {
      res.writeHead(429, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ detail: `stub: SSE client limit (${MAX_SSE}) reached` }))
      return
    }
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' })
    const last = req.headers['last-event-id']
    if (last) {
      const m = /^(.+):(\d+)$/.exec(String(last))
      if (!m || m[1] !== instance) send(res, resetEvent('server_restart'))
      else if (Number(m[2]) !== seq) send(res, resetEvent('gap')) // 재생 버퍼 없음
    }
    send(res, statusEvent())
    clients.add(res)
    req.on('close', () => clients.delete(res))
  }

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://stub')
    const json = (status, body) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
      res.end(JSON.stringify(body))
    }
    try {
      if (url.pathname.startsWith('/__stub/')) return control(url, json)
      if (!url.pathname.startsWith(PREFIX)) throw new HttpError(404, 'not found')
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD', 'Content-Type': 'application/json' })
        return res.end(JSON.stringify({ detail: 'read-only API: mutation methods are rejected' }))
      }
      if (url.pathname === `${PREFIX}/events`) return openEvents(req, res)
      const out = route(req, url)
      if (out.json !== undefined) return json(200, out.json)
      res.writeHead(200, out.headers)
      res.end(req.method === 'HEAD' ? undefined : out.body)
    } catch (e) {
      if (e instanceof HttpError) return json(e.status, { detail: e.message })
      console.error(e)
      json(500, { detail: 'stub internal error' })
    }
  })

  // ── 테스트 제어 (/__stub/*, 실제 API 아님) ───────────────────────────────
  function control(url, json) {
    const act = url.pathname.slice('/__stub/'.length)
    const q = url.searchParams
    if (act === 'set') {
      if (q.has('mode')) opts.mode = q.get('mode')
      if (q.has('freshness')) opts.freshness = q.get('freshness') || null
      if (q.has('fail')) opts.fail = q.get('fail')
      if (q.has('csv_limit')) opts.csvLimit = Number(q.get('csv_limit'))
    } else if (act === 'skip') {
      seq += Number(q.get('n') ?? 5) // 다음 이벤트에서 cursor gap 발생
    } else if (act === 'restart') {
      instance = `stub${++restarts}`
      seq = 0
      for (const r of clients) r.end() // 연결을 끊어 클라이언트가 Last-Event-ID 로 재접속하게 한다
      clients.clear()
    } else if (act === 'drop') {
      for (const r of clients) r.end()
      clients.clear()
    } else if (act !== 'state') {
      return json(404, { detail: 'unknown stub control' })
    }
    json(200, { instance, seq, clients: clients.size, opts })
  }

  let tickTimer = null
  let beatTimer = null
  return {
    server,
    opts,
    start(port = 0) {
      return new Promise((resolve) => {
        server.listen(port, () => {
          tickTimer = setInterval(() => {
            seq++
            const chunk = statusEvent()
            for (const r of clients) send(r, chunk)
          }, opts.tickMs)
          beatTimer = setInterval(() => { for (const r of clients) send(r, ': heartbeat\n\n') }, opts.heartbeatMs)
          resolve(server.address().port)
        })
      })
    },
    stop() {
      clearInterval(tickTimer)
      clearInterval(beatTimer)
      for (const r of clients) r.end()
      clients.clear()
      return new Promise((resolve) => { server.close(() => resolve()); server.closeAllConnections?.() })
    },
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const stub = createStubServer({
    mode: process.env.STUB_MODE ?? 'live',
    csvLimit: Number(process.env.STUB_CSV_LIMIT ?? 100000),
    tickMs: Number(process.env.STUB_TICK_MS ?? 1000),
  })
  const port = await stub.start(Number(process.env.STUB_PORT ?? 8787))
  console.log(`[stub] xArm API stub (합성 데이터) http://localhost:${port}${PREFIX}  mode=${stub.opts.mode}`)
  console.log('[stub] 제어: /__stub/set?mode=live|history|no_data&freshness=stale&fail=status|cycles|models|none&csv_limit=N')
  console.log('[stub]       /__stub/skip?n=5 (cursor gap) · /__stub/restart (서버 재시작) · /__stub/drop (SSE 연결 끊기) · /__stub/state')
}
