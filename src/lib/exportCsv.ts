import { CYCLE_COLUMNS } from '../data/db'
import type { CycleRow, ModelSelection } from '../types'

function csvCell(v: unknown): string {
  let s = v == null ? '' : String(v)
  // CSV/수식 인젝션 방지
  if (/^[=+@-]/.test(s) && typeof v !== 'number') s = "'" + s
  return '"' + s.replace(/"/g, '""') + '"'
}

/** UTF-8 BOM + 따옴표 셀. null/undefined 는 빈 셀이며 0·정상으로 바꾸지 않는다. */
export function historyCsvText(rows: CycleRow[], keys: string[] = CYCLE_COLUMNS): string {
  return (
    '\uFEFF' +
    [keys, ...rows.map((r) => keys.map((k) => r[k as keyof CycleRow]))]
      .map((row) => row.map(csvCell).join(','))
      .join('\r\n')
  )
}

export function exportHistoryCsv(rows: CycleRow[], sel: ModelSelection) {
  const text = historyCsvText(rows)
  const url = URL.createObjectURL(
    new Blob([text], { type: 'text/csv;charset=utf-8' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = `momo_evaluation_${sel.representation}_${sel.input_set}_${sel.algorithm}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
