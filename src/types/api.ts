/**
 * `/api/v1` 읽기 전용 API 응답 타입 (docs/API_CONTRACT.md 기준).
 *
 * 서버가 보장하는 필드만 필수로 두고, 나머지는 optional/nullable로 둔다.
 * `alarm`은 반드시 boolean | null 이며 truthiness 변환을 하지 않는다.
 */

export type Alarm = boolean | null

export type StatusMode = 'live' | 'history' | 'no_data'
export type FreshnessStatus = 'active' | 'stale' | 'historical' | 'no_data'

/** combined.type 의 원 유형 */
export type OriginalType = 'A121' | 'B82' | 'C182' | 'unknown' | 'no_alarm' | 'unavailable'

/** auxiliary.estimated_type (unknown 에만 붙는 보조 추정) */
export type AuxiliaryType =
  | 'normal_like'
  | 'A121'
  | 'B82'
  | 'C182'
  | 'D'
  | 'E'
  | 'F'
  | 'foam_contact'
  | 'station_disturbance'

/** 실제 확인 라벨 (operator.label / label 필터) */
export type TruthLabel =
  | 'normal'
  | 'A121'
  | 'B82'
  | 'C182'
  | 'D'
  | 'E'
  | 'F'
  | 'foam_contact'
  | 'station_disturbance'

export interface Freshness {
  status: FreshnessStatus
  age_s?: number | null
  reason?: string | null
}

export interface SensorBase {
  valid?: boolean | null
  /** 호스트 monotonic 시각. Date 로 변환하지 않는다. */
  monotonic_ns?: number | null
  quality?: string | null
}

export interface InaSample extends SensorBase {
  current_A?: number | null
  voltage_V?: number | null
  power_W?: number | null
}

export interface AdxlSample extends SensorBase {
  x_g?: number | null
  y_g?: number | null
  z_g?: number | null
}

export interface PositionSample extends SensorBase {
  position_raw?: number | null
}

export interface Sensors {
  ina?: InaSample | null
  adxl?: AdxlSample | null
  /** 키 '1'..'6'. 순차 조회이며 동시 측정이 아니다. */
  positions?: Record<string, PositionSample> | null
}

export interface Detector {
  score?: number | null
  threshold?: number | null
  alarm?: Alarm
}

export interface CombinedDetector {
  alarm?: Alarm
  type?: OriginalType | string | null
  score?: null
  threshold?: null
}

export interface Detectors {
  catboost?: Detector | null
  gru?: Detector | null
  combined?: CombinedDetector | null
  /** old_logistic_gru 과거 자료 */
  logistic?: Detector | null
}

export interface Auxiliary {
  estimated_type?: AuxiliaryType | string | null
  estimate_status?: string | null
  tentative?: boolean | null
  probabilities?: Record<string, number> | null
}

export interface CycleQuality {
  missing_slots?: number | null
  position_soft_timeouts?: number | null
  phase_quality?: string | null
  error?: string | null
}

export interface Operator {
  confirmed?: boolean | null
  label?: TruthLabel | string | null
  outcome?: string | null
}

export interface CycleInfo {
  index?: number | null
  run_id?: string | null
  phase?: string | null
  start_ns?: number | null
  end_ns?: number | null
}

export interface CycleStatistics {
  available: boolean
  [key: string]: unknown
}

/** canonical 회차 */
export interface Cycle {
  schema_version: string | number
  /** opaque 회차 ID. 그대로 저장하고 URL 인코딩해서만 사용한다. */
  id: string
  run_id?: string | null
  run_name?: string | null
  /** 계획된 조건. 정답이 아니다. */
  condition?: string | null
  source_group?: string | null
  data_kind?: string | null
  source?: { scope?: string | null; root?: string | null; relative_path?: string | null } | null
  captured_utc?: string | null
  updated_utc?: string | null
  freshness: Freshness
  cycle?: CycleInfo | null
  sensors?: Sensors | null
  detectors?: Detectors | null
  auxiliary?: Auxiliary | null
  quality?: CycleQuality | null
  operator?: Operator | null
  model_profile?: string | null
  statistics?: CycleStatistics | null
}

export interface IndexerInfo {
  [key: string]: unknown
}

export interface StatusResponse {
  schema_version: string | number
  server_time_utc: string
  mode: StatusMode
  latest: Cycle | null
  indexer?: IndexerInfo | null
  /** `<server_instance>:<seq>` */
  stream?: { cursor?: string | null } | null
}

export interface HealthResponse {
  [key: string]: unknown
}

export interface ModelsResponse {
  [key: string]: unknown
}

export interface CyclesPage {
  items: Cycle[]
  total: number
  limit: number
  offset: number
}

export interface CyclesQuery {
  alarm?: boolean | null
  confirmed?: boolean
  label?: TruthLabel
  condition?: string
  run_id?: string
  model_profile?: string
  source_group?: string
  /** 시간대 포함 ISO 8601 */
  from_utc?: string
  to_utc?: string
  limit?: number
  offset?: number
}

export type MetricsQuery = Omit<CyclesQuery, 'limit' | 'offset'>

export interface MetricsResponse {
  confirmed_total?: number
  confirmed_scored?: number
  confirmed_unavailable?: number
  normal_scored?: number
  anomaly_scored?: number
  pending_or_unclassified_truth?: number
  excluded_no_motion?: number
  [key: string]: unknown
}

export type SeriesChannel =
  | 'ina'
  | 'adxl'
  | 'positions'
  | 'forecasts'
  | 'residuals'
  | 'alarms'
  | 'publication'

export interface SeriesQuery {
  limit?: number
  channels?: SeriesChannel[] | string
  from_s?: number
  to_s?: number
}

export interface SeriesResponse {
  cycle_id: string
  series: Partial<Record<SeriesChannel, Array<Record<string, unknown>>>>
  limit: number
  truncated: boolean
  source_quality?: Record<string, unknown> | null
}

export interface TrendsQuery extends MetricsQuery {
  limit?: number
}

export interface TrendsResponse {
  points: Array<Record<string, unknown>>
  total: number
  limit: number
  truncated: boolean
}

export interface CsvInfo {
  url: string
  total: number
  rows: number
  truncated: boolean
}

/** 화면에 표시하는 연결 상태. 'idle'은 API를 쓰지 않는 공개 평가 모드. */
export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'polling'
  | 'offline'
  | 'closed'

export type CursorTransition = 'invalid' | 'first' | 'restart' | 'duplicate' | 'rewind' | 'next' | 'gap'
