import type { CyclesPage, ModelsResponse, StatusResponse } from '../../types/api'

export class ApiSchemaError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiSchemaError'
  }
}

const MODES = ['live', 'history', 'no_data']

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function hasSchemaVersion(v: Record<string, unknown>): boolean {
  return (typeof v.schema_version === 'string' && v.schema_version !== '') || typeof v.schema_version === 'number'
}

/** `alarm`은 boolean 또는 null 이어야 한다. 문자열 등은 파싱하지 않고 오류로 본다. */
function checkAlarm(owner: unknown, path: string) {
  if (!isRecord(owner) || !('alarm' in owner)) return
  const a = owner.alarm
  if (a !== true && a !== false && a !== null) {
    throw new ApiSchemaError(`${path}.alarm must be boolean or null`)
  }
}

function checkCycle(cycle: unknown, path: string) {
  if (!isRecord(cycle)) throw new ApiSchemaError(`${path} must be an object`)
  if (typeof cycle.id !== 'string' || cycle.id === '') throw new ApiSchemaError(`${path}.id missing`)
  if (!isRecord(cycle.freshness) || typeof cycle.freshness.status !== 'string') {
    throw new ApiSchemaError(`${path}.freshness.status missing`)
  }
  const det = cycle.detectors
  if (isRecord(det)) {
    checkAlarm(det.catboost, `${path}.detectors.catboost`)
    checkAlarm(det.gru, `${path}.detectors.gru`)
    checkAlarm(det.combined, `${path}.detectors.combined`)
    checkAlarm(det.logistic, `${path}.detectors.logistic`)
  }
}

export function validateStatus(value: unknown): StatusResponse {
  if (!isRecord(value)) throw new ApiSchemaError('status must be an object')
  if (!hasSchemaVersion(value)) throw new ApiSchemaError('status.schema_version missing')
  if (typeof value.mode !== 'string' || !MODES.includes(value.mode)) {
    throw new ApiSchemaError('status.mode must be live | history | no_data')
  }
  if (typeof value.server_time_utc !== 'string') throw new ApiSchemaError('status.server_time_utc missing')
  if (value.latest != null) checkCycle(value.latest, 'status.latest')
  return value as unknown as StatusResponse
}

export function validateCyclesPage(value: unknown): CyclesPage {
  if (!isRecord(value)) throw new ApiSchemaError('cycles response must be an object')
  const { items, total, limit, offset } = value
  if (!Array.isArray(items)) throw new ApiSchemaError('cycles.items must be an array')
  if (!Number.isInteger(total)) throw new ApiSchemaError('cycles.total must be an integer')
  if (!Number.isInteger(limit) || !Number.isInteger(offset)) {
    throw new ApiSchemaError('cycles.limit/offset must be integers')
  }
  items.forEach((item, i) => checkCycle(item, `cycles.items[${i}]`))
  return value as unknown as CyclesPage
}

export function validateModels(value: unknown): ModelsResponse {
  if (!isRecord(value)) throw new ApiSchemaError('models must be an object')
  return value as ModelsResponse
}
