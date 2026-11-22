import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { CycleRow } from '../types'
import { resultKey } from '../lib/selectors'

const MAX_ITEMS = 2

interface ComparisonContextValue {
  items: CycleRow[]
  open: boolean
  message: string
  add: (row: CycleRow) => void
  remove: (index: number) => void
  close: () => void
}

const ComparisonContext = createContext<ComparisonContextValue | null>(null)

export function ComparisonProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CycleRow[]>([])
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')

  const add = useCallback(
    (row: CycleRow) => {
      setOpen(true)
      if (items.some((r) => resultKey(r) === resultKey(row))) return
      if (items.length >= MAX_ITEMS) {
        setMessage('최대 2개까지 비교할 수 있습니다. 기존 항목 하나를 닫은 뒤 추가하세요.')
        return
      }
      setItems([...items, { ...row }])
      setMessage('')
    },
    [items],
  )

  const remove = useCallback(
    (index: number) => {
      const next = items.filter((_, i) => i !== index)
      setItems(next)
      setMessage('')
      if (!next.length) setOpen(false)
    },
    [items],
  )

  const close = useCallback(() => setOpen(false), [])

  const value = useMemo(
    () => ({ items, open, message, add, remove, close }),
    [items, open, message, add, remove, close],
  )
  return <ComparisonContext value={value}>{children}</ComparisonContext>
}

export function useComparison() {
  const ctx = useContext(ComparisonContext)
  if (!ctx) throw new Error('useComparison must be used within ComparisonProvider')
  return ctx
}
