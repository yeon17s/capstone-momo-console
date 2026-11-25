import type { ConnectionState } from '../../types/api'

export type ConnectionTone = 'blue' | 'warn' | 'good' | 'bad' | ''

/** 연결 상태 표시. 'connected'는 HTTP/SSE 연결일 뿐 장비 운전·센서 정상이 아니다. */
export const CONNECTION_VIEW: Record<ConnectionState, { label: string; tone: ConnectionTone }> = {
  idle: { label: '미연결', tone: '' },
  connecting: { label: '연결 중', tone: 'warn' },
  connected: { label: 'SSE 연결됨', tone: 'good' },
  reconnecting: { label: '재연결 중', tone: 'warn' },
  polling: { label: 'polling', tone: 'blue' },
  offline: { label: '오프라인', tone: 'bad' },
  closed: { label: '종료됨', tone: '' },
}
