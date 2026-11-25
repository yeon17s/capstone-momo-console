// 개발용 stub 데이터. docs/API_CONTRACT.md 의 필드 구조만 따르는 합성 값이다.
// 값은 UI 흐름 확인용이며 장비 성능·정확도·실측 근거가 아니다.
export const TRUTH_LABELS = ['normal', 'A121', 'B82', 'C182', 'D', 'E', 'F', 'foam_contact', 'station_disturbance']
export const CB_THRESHOLD = 0.6
export const GRU_THRESHOLD = 7.288925055167675

const BASE_MS = Date.UTC(2026, 10, 25, 3, 0, 0)
export const CYCLE_COUNT = 60

/** i=0 이 가장 최근 회차. id 에는 ':' 와 '/' 를 넣어 opaque ID 인코딩을 확인한다. */
export function buildCycle(i) {
  const kind = i % 10
  const run = i < 30 ? 'STUB-RUN-A' : 'STUB-RUN-B'
  const capturedMs = BASE_MS - i * 10 * 60 * 1000
  const iso = new Date(capturedMs).toISOString()

  let alarm = false
  let type = 'no_alarm'
  let aux = null
  let confirmed = true
  let label = 'normal'
  let condition = 'baseline'
  let profile = 'stub_catboost_gru'
  let phaseQuality = 'ok'
  let freshness = { status: 'historical', age_s: null, reason: 'stub: 저장된 기록' }

  switch (kind) {
    case 0: alarm = true; type = 'A121'; label = 'A121'; condition = 'load_plus'; break
    case 1: alarm = null; type = 'unavailable'; confirmed = false; label = null; break
    case 2: alarm = true; type = 'unknown'; aux = 'normal_like'; break
    case 3: profile = 'old_logistic_gru'; break
    case 4: confirmed = false; label = null; break
    case 5: alarm = true; type = 'B82'; label = 'B82'; condition = 'load_plus'; break
    case 6: label = 'C182'; condition = 'load_plus'; break // 확인 라벨은 이상인데 경보 없음(미탐)
    case 7: phaseQuality = 'no_motion'; break
    default: break
  }
  const alarmOf = (v) => (alarm === null ? null : v)
  const cbScore = alarm === null ? null : alarm ? 0.72 + (i % 5) * 0.03 : 0.1 + (i % 7) * 0.04
  const gruScore = alarm === null ? null : alarm ? 8 + (i % 4) : 2 + (i % 3)

  const detectors = {
    catboost: { score: cbScore, threshold: CB_THRESHOLD, alarm: alarmOf(alarm === true) },
    gru: { score: gruScore, threshold: GRU_THRESHOLD, alarm: alarmOf(alarm === true && kind !== 2) },
    combined: { alarm, type, score: null, threshold: null },
  }
  if (profile === 'old_logistic_gru') {
    detectors.logistic = { score: 0.2, threshold: 0.5, alarm: false }
    delete detectors.catboost
  }

  const t = i * 0.37
  return {
    schema_version: '1',
    id: `stub:${run}/c${i}`,
    run_id: run,
    run_name: `${run} (stub)`,
    condition,
    source_group: i % 2 ? 'stub_group_b' : 'stub_group_a',
    data_kind: 'stub_no3',
    source: { scope: 'stub', root: 'stub-root', relative_path: `${run}/cycle_${i}.jsonl` },
    captured_utc: iso,
    updated_utc: iso,
    freshness,
    cycle: { index: i, run_id: run, phase: 'done', start_ns: i * 1e9, end_ns: i * 1e9 + 4e10 },
    sensors: {
      ina: {
        current_A: 1.1 + 0.2 * Math.sin(t), voltage_V: 24.0 + 0.1 * Math.cos(t), power_W: 26.4 + Math.sin(t),
        valid: kind !== 1, monotonic_ns: 5e9 + i * 1e9, quality: kind === 1 ? 'degraded' : 'ok',
      },
      adxl: { x_g: 0.01 * Math.sin(t), y_g: 0.02 * Math.cos(t), z_g: 1.0, valid: true, monotonic_ns: 5e9 + i * 1e9 },
      positions: Object.fromEntries(
        [1, 2, 3, 4, 5, 6].map((k) => [String(k), { position_raw: 1000 * k + (i % 9), valid: !(kind === 1 && k === 3), monotonic_ns: 5e9 + i * 1e9 + k * 1e6 }]),
      ),
    },
    detectors,
    auxiliary: {
      estimated_type: aux ?? (type === 'unknown' ? 'unavailable' : 'not_applicable'),
      estimate_status: aux ? 'estimated' : 'not_applicable',
      tentative: !!aux,
      probabilities: aux ? { normal_like: 0.62, A121: 0.2, B82: 0.18 } : null,
    },
    quality: {
      missing_slots: kind === 1 ? 12 : 0,
      position_soft_timeouts: kind === 1 ? 3 : 0,
      phase_quality: phaseQuality,
      error: null,
    },
    operator: { confirmed, label, outcome: confirmed ? 'stub_observed' : null },
    model_profile: profile,
    statistics: kind === 1
      ? { available: false }
      : { available: true, current_A: { mean: 1.1, rms: 1.12 }, vibration_g: { rms: 0.02 } },
    _stub: { kind, capturedMs },
  }
}

export const CYCLES = Array.from({ length: CYCLE_COUNT }, (_, i) => buildCycle(i))

/** 응답에서는 내부 필드를 제거한다. */
export const publicCycle = (c) => {
  const { _stub, ...rest } = c
  return rest
}

function range(n) { return Array.from({ length: n }, (_, i) => i) }

/** 회차 파형. 일부 구간은 의도적으로 누락(행 없음/null)해 선 끊김을 확인한다. */
export function buildSeries(index) {
  const seed = index * 0.37
  const ina = range(200)
    .filter((k) => !(k >= 80 && k < 100)) // 샘플 누락 구간
    .map((k) => ({
      monotonic_ns: 5e9 + k * 2e8, t_s: k * 0.2,
      current_A: k % 37 === 0 ? null : 1.1 + 0.3 * Math.sin(seed + k / 10),
      voltage_V: 24 + 0.1 * Math.cos(k / 8), power_W: 26 + 0.5 * Math.sin(k / 12),
    }))
  const adxl = range(200).map((k) => ({
    monotonic_ns: 5e9 + k * 2e8, t_s: k * 0.2,
    x_g: 0.02 * Math.sin(k / 5), y_g: 0.02 * Math.cos(k / 7), z_g: 1 + 0.01 * Math.sin(k / 3),
  }))
  const positions = range(80).flatMap((k) =>
    [1, 2, 3, 4, 5, 6].map((s) => ({
      monotonic_ns: 5e9 + k * 5e8 + s * 1e6, t_s: k * 0.5 + s * 0.01, servo_id: s,
      position_raw: k % 23 === 0 && s === 3 ? null : 1000 * s + Math.round(100 * Math.sin(k / 6 + s)),
    })),
  )
  const forecasts = range(190).map((k) => ({
    issue_ns: 5e9 + k * 2e8, t_s: 1 + k * 0.2,
    targets: { I_A: 1.1 + 0.3 * Math.sin(seed + (k + 5) / 10), V_V: 24 },
  }))
  const residuals = range(190).flatMap((k) =>
    ['I_A', 'V_V'].map((target) => ({
      available_ns: 5e9 + k * 2e8, t_s: 1.2 + k * 0.2, target,
      actual: target === 'I_A' ? 1.1 : 24, forecast: target === 'I_A' ? 1.12 : 24,
      score: 0.5 + Math.abs(Math.sin(k / 9)) * 3, alarm: false,
    })),
  )
  const alarms = [{ t_s: 12.4, source: 'gru', alarm: index % 10 === 0 }]
  const publication = range(190).map((k) => ({ t_s: 1 + k * 0.2, interval_ms: k % 50 === 49 ? 480 : 200 }))
  return { ina, adxl, positions, forecasts, residuals, alarms, publication }
}

export function buildTrends(runId) {
  return CYCLES.filter((c) => c.run_id === runId)
    .sort((a, b) => a._stub.capturedMs - b._stub.capturedMs)
    .map((c) => ({
      cycle_id: c.id, captured_utc: c.captured_utc,
      scores: { catboost: c.detectors.catboost?.score ?? null, gru_max: c.detectors.gru.score },
      statistics: c.statistics.available
        ? { available: true, current_rms_A: 1.1 + (c._stub.kind % 5) * 0.02 }
        : { available: false },
    }))
}
