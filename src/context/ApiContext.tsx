import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Client } from '../lib/api'
import type { ConnectionState, CyclesPage, ModelsResponse, StatusResponse } from '../types/api'
import { useSource } from './SourceContext'

interface ApiContextValue {
  /** xArm 모드가 아니면 null */
  client: Client | null
  connection: ConnectionState
  /** 마지막으로 수신한 /status. 연결이 끊겨도 '마지막 관측값'으로 남는다. */
  status: StatusResponse | null
  models: ModelsResponse | null
  cycles: CyclesPage | null
  /** 초기 로드·SSE reset/gap/재연결로 전체 재조회가 일어난 횟수. 파생 조회(metrics 등)의 재조회 신호. */
  refreshCount: number
  /** 마지막 오류 메시지. 오류를 정상 값으로 바꾸지 않는다. */
  error: string | null
}

const ApiContext = createContext<ApiContextValue | null>(null)

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? ''

interface Snapshot {
  connection: ConnectionState
  status: StatusResponse | null
  models: ModelsResponse | null
  cycles: CyclesPage | null
  refreshCount: number
  error: string | null
}

const EMPTY: Snapshot = { connection: 'idle', status: null, models: null, cycles: null, refreshCount: 0, error: null }

export function ApiProvider({ children }: { children: ReactNode }) {
  const { usesApi } = useSource()
  const [client, setClient] = useState<Client | null>(null)
  const [snap, setSnap] = useState<Snapshot>(EMPTY)

  useEffect(() => {
    if (!usesApi) return
    // 효과 실행마다 새 Client 를 만들어 StrictMode 의 start/stop/start 경합을 피한다.
    const c = new Client({
      baseURL: API_BASE,
      onStatus: (status) => setSnap((s) => ({ ...s, status, error: null })),
      onCycles: (cycles) => setSnap((s) => ({ ...s, cycles })),
      onModels: (models) => setSnap((s) => ({ ...s, models })),
      onConnection: (connection) => setSnap((s) => ({ ...s, connection })),
      onRefreshRequired: () => setSnap((s) => ({ ...s, refreshCount: s.refreshCount + 1 })),
      onError: (e) => setSnap((s) => ({ ...s, error: e.message })),
    })
    setClient(c)
    void c.start()
    const onHide = () => c.stop()
    // 뒤로가기 캐시(bfcache)에서 복원되면 pagehide 로 멈춘 클라이언트를 다시 시작한다.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) void c.start()
    }
    window.addEventListener('pagehide', onHide)
    window.addEventListener('pageshow', onShow)
    return () => {
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('pageshow', onShow)
      c.stop()
      setClient(null)
      setSnap(EMPTY)
    }
  }, [usesApi])

  const value = useMemo<ApiContextValue>(() => ({ client, ...snap }), [client, snap])
  return <ApiContext value={value}>{children}</ApiContext>
}

export function useApi() {
  const ctx = useContext(ApiContext)
  if (!ctx) throw new Error('useApi must be used within ApiProvider')
  return ctx
}
