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
  error: string | null
}

const EMPTY: Snapshot = { connection: 'idle', status: null, models: null, cycles: null, error: null }

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
      onError: (e) => setSnap((s) => ({ ...s, error: e.message })),
    })
    setClient(c)
    void c.start()
    const onHide = () => c.stop()
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
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
