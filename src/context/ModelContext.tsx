import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { ModelSelection } from '../types'

interface ModelContextValue {
  model: ModelSelection
  setModelField: (key: keyof ModelSelection, value: string) => void
}

const ModelContext = createContext<ModelContextValue | null>(null)

const INITIAL: ModelSelection = {
  representation: 'cycle',
  input_set: 'A',
  algorithm: 'statistical',
}

export function ModelProvider({ children }: { children: ReactNode }) {
  const [model, setModel] = useState<ModelSelection>(INITIAL)
  const value = useMemo<ModelContextValue>(
    () => ({
      model,
      setModelField: (key, v) => setModel((prev) => ({ ...prev, [key]: v })),
    }),
    [model],
  )
  return <ModelContext value={value}>{children}</ModelContext>
}

export function useModel() {
  const ctx = useContext(ModelContext)
  if (!ctx) throw new Error('useModel must be used within ModelProvider')
  return ctx
}
