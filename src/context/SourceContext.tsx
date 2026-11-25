import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

/** 화면 데이터 소스. 서로 섞어 표시하지 않는다. */
export type SourceMode = 'public' | 'xarm-history' | 'xarm-live'

export interface SourceContextValue {
  mode: SourceMode
  setMode: (mode: SourceMode) => void
  /** xArm API(/api/v1)를 사용하는 모드인지 */
  usesApi: boolean
}

/** 테스트에서 값을 직접 주입하기 위해 export 한다. */
export const SourceContext = createContext<SourceContextValue | null>(null)

export function SourceProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<SourceMode>('public')
  const value = useMemo<SourceContextValue>(
    () => ({ mode, setMode, usesApi: mode !== 'public' }),
    [mode],
  )
  return <SourceContext value={value}>{children}</SourceContext>
}

export function useSource() {
  const ctx = useContext(SourceContext)
  if (!ctx) throw new Error('useSource must be used within SourceProvider')
  return ctx
}
