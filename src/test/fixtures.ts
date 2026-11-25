// 화면 테스트용 fixture. API_CONTRACT.md 의 필드 구조만 따르는 합성 값이며 실측·성능 근거가 아니다.
import type { Alarm, Cycle, MetricsResponse, StatusMode, StatusResponse } from '../types/api'

export function cycle(over: Partial<Cycle> & { alarm?: Alarm; type?: string } = {}): Cycle {
  const { alarm = false, type = 'no_alarm', ...rest } = over
  return {
    schema_version: '1',
    id: 'c/1',
    run_id: 'RUN-1',
    condition: 'baseline',
    source_group: 'g1',
    data_kind: 'test',
    captured_utc: '2026-11-25T03:00:00.000Z',
    updated_utc: '2026-11-25T03:00:00.000Z',
    freshness: { status: 'active', age_s: 0.2, reason: 'test' },
    cycle: { index: 7, run_id: 'RUN-1', phase: 'done' },
    sensors: {
      ina: { current_A: 1.5, voltage_V: 24, power_W: 36, valid: true },
      adxl: { x_g: 0, y_g: 0, z_g: 1, valid: true },
      positions: { '1': { position_raw: 1000, valid: true } },
    },
    detectors: {
      catboost: { score: 0.2, threshold: 0.6, alarm },
      gru: { score: 2, threshold: 7.288925055167675, alarm },
      combined: { alarm, type, score: null, threshold: null },
    },
    auxiliary: { estimated_type: 'not_applicable', estimate_status: 'not_applicable', tentative: false },
    quality: { missing_slots: 0, position_soft_timeouts: 0, phase_quality: 'ok', error: null },
    operator: { confirmed: false, label: null, outcome: null },
    model_profile: 'test_profile',
    statistics: { available: true },
    ...rest,
  }
}

export function status(latest: Cycle | null, mode: StatusMode = 'live'): StatusResponse {
  return { schema_version: '1', server_time_utc: '2026-11-25T03:00:01.000Z', mode, latest, stream: { cursor: 'i:1' } }
}

export const metrics = (over: Partial<MetricsResponse> = {}): MetricsResponse => ({
  confirmed_total: 10,
  confirmed_scored: 9,
  confirmed_unavailable: 1,
  normal_scored: 5,
  anomaly_scored: 4,
  pending_or_unclassified_truth: 3,
  excluded_no_motion: 2,
  normal_fpr: null,
  ...over,
})
