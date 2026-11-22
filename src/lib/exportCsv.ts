import { CYCLE_COLUMNS } from '../data/db'
import type { CycleRow, ModelSelection } from '../types'

function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v)
  // CSV/수식 인젝션 방지
  if (/^[=+@-]/.test(s) && typeof v !== 'number') s = "'" + s
  return '"' + s.replace(/"/g, '""') + '"'
}

export function exportHistoryCsv(rows: CycleRow[], sel: ModelSelection) {
  const keys = CYCLE_COLUMNS
  const text =
    '﻿' +
    [keys, ...rows.map((r) => keys.map((k) => r[k as keyof CycleRow]))]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n')
  const url = URL.createObjectURL(
    new Blob([text], { type: 'text/csv;charset=utf-8' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = `momo_evaluation_${sel.representation}_${sel.input_set}_${sel.algorithm}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
