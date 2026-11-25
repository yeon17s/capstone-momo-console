import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Client } from '../lib/api'
import type { ConnectionState, CyclesPage, ModelsResponse, StatusResponse } from '../types/api'
import { useSource } from './SourceContext'

export interface ApiContextValue {
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

/** 테스트에서 값을 직접 주입하기 위해 export 한다. 앱 코드는 ApiProvider/useApi 를 사용한다. */
export const ApiContext = createContext<ApiContextValue | null>(null)

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

/**
 * 모드(공개 / xArm)가 바뀌면 key 로 다시 마운트해 이전 모드의 상태가 남지 않게 한다.
 * Client 는 렌더 중에 만들고(생성자는 부수효과 없음) 시작·종료만 effect 에서 한다.
 */
function ApiSession({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const [snap, setSnap] = useState<Snapshot>(EMPTY)

  const client = useMemo(
    () =>
      enabled
        ? new Client({
            baseURL: API_BASE,
            onStatus: (status) => setSnap((s) => ({ ...s, status, error: null })),
            onCycles: (cycles) => setSnap((s) => ({ ...s, cycles })),
            onModels: (models) => setSnap((s) => ({ ...s, models })),
            onConnection: (connection) => setSnap((s) => ({ ...s, connection })),
            onRefreshRequired: () => setSnap((s) => ({ ...s, refreshCount: s.refreshCount + 1 })),
            onError: (e) => setSnap((s) => ({ ...s, error: e.message })),
          })
        : null,
    [enabled],
  )

  useEffect(() => {
    if (!client) return
    // StrictMode 의 start → stop → start 에서도 Client 의 generation 검사로 스트림이 한 번만 열린다.
    void client.start()
    const onHide = () => client.stop()
    // 뒤로가기 캐시(bfcache)에서 복원되면 pagehide 로 멈춘 클라이언트를 다시 시작한다.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) void client.start()
    }
    window.addEventListener('pagehide', onHide)
    window.addEventListener('pageshow', onShow)
    return () => {
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('pageshow', onShow)
      client.stop()
    }
  }, [client])

  const value = useMemo<ApiContextValue>(() => ({ client, ...snap }), [client, snap])
  return <ApiContext value={value}>{children}</ApiContext>
}

export function ApiProvider({ children }: { children: ReactNode }) {
  const { usesApi } = useSource()
  return (
    <ApiSession key={usesApi ? 'xarm' : 'public'} enabled={usesApi}>
      {children}
    </ApiSession>
  )
}

export function useApi() {
  const ctx = useContext(ApiContext)
  if (!ctx) throw new Error('useApi must be used within ApiProvider')
  return ctx
}
