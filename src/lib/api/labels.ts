import type { Alarm, CursorTransition } from '../../types/api'

export const TYPE_NAMES: Readonly<Record<string, string>> = Object.freeze({
  normal: '정상',
  A121: '운반 하중 증가 · A121',
  B82: '상부 하중 · B82',
  C182: '하부 하중 · C182',
  D: '최초 파지 실패 · D',
  E: '들어 올리다 이탈 · E',
  F: '작업물 범위 밖 · F',
  foam_contact: '폼 접촉',
  station_disturbance: '작업대 흔들림',
  normal_like: '정상 유사 · 원경보 유지',
  unknown: '유형 미상',
  no_alarm: '미경보',
  unavailable: '분류 불가',
  not_applicable: '보조 추정 비대상',
})

/** true / false / null 3상태. 그 외 값은 오류로 처리하며 truthiness 변환을 하지 않는다. */
export function alarmLabel(value: Alarm | undefined): string {
  if (value === true) return '이상 경보'
  if (value === false) return '미경보'
  if (value === null || value === undefined) return '미판정'
  throw new TypeError('alarm must be true, false, or null')
}

export function typeLabel(value: string | null | undefined): string {
  if (value == null) return '미제공'
  return TYPE_NAMES[value] ?? String(value)
}

export function numberLabel(value: unknown, digits = 3): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toLocaleString('ko-KR', { maximumFractionDigits: digits })
    : '—'
}

export function cursorParts(value: unknown): { instance: string; sequence: number } | null {
  if (typeof value !== 'string') return null
  const match = /^(.+):(\d+)$/.exec(value)
  if (!match || !Number.isSafeInteger(Number(match[2]))) return null
  return { instance: match[1], sequence: Number(match[2]) }
}

/** cursor 는 `<server_instance>:<seq>` 이며 숫자로 가정하지 않는다. */
export function cursorTransition(previous: unknown, next: unknown): CursorTransition {
  const current = cursorParts(next)
  const old = cursorParts(previous)
  if (!current) return 'invalid'
  if (!old) return 'first'
  if (current.instance !== old.instance) return 'restart'
  if (current.sequence === old.sequence) return 'duplicate'
  if (current.sequence < old.sequence) return 'rewind'
  return current.sequence === old.sequence + 1 ? 'next' : 'gap'
}
