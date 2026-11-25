import { useMemo, useState } from 'react'
import { useSource } from '../context/SourceContext'
import { XarmPending } from '../components/layout/XarmPending'
import { useModel } from '../context/ModelContext'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { exportHistoryCsv } from '../lib/exportCsv'
import { num } from '../lib/format'
import { evaluationRows } from '../lib/selectors'
import type { CycleRow } from '../types'
import { Card, Notice } from '../components/common'
import { HistoryFilters, HistoryTable, Pager, type HistoryFilterState } from '../components/history'

const PAGE_SIZE = 25

function filterRows(base: CycleRow[], f: HistoryFilterState): CycleRow[] {
  const q = f.search.toLowerCase()
  const rows = base.filter(
    (r) =>
      (f.truth === 'all' || r.anomaly === (f.truth === 'true')) &&
      (f.prediction === 'all' || r.prediction === (f.prediction === 'true')) &&
      [r.sample, r.category_name, r.variant_name, r.setting].some((v) =>
        String(v ?? '').toLowerCase().includes(q),
      ),
  )
  const key = f.sort as keyof CycleRow
  return rows.sort((a, b) => {
    const x = a[key]
    const y = b[key]
    if (x == null) return y == null ? 0 : 1
    if (y == null) return -1
    const c = typeof x === 'number' ? x - (y as number) : String(x).localeCompare(String(y))
    return f.desc ? -c : c
  })
}

function PublicHistory() {
  const { model } = useModel()
  const [filters, setFilters] = useState<HistoryFilterState>({
    search: '',
    truth: 'all',
    prediction: 'all',
    sort: 'sample',
    desc: false,
  })
  const debouncedSearch = useDebouncedValue(filters.search)

  // 모델·확정된 검색어·필터가 바뀌면 페이지를 1로 되돌린다 (키가 달라지면 저장된 페이지는 무효).
  const pageKey = [
    model.representation,
    model.input_set,
    model.algorithm,
    debouncedSearch,
    filters.truth,
    filters.prediction,
    filters.sort,
  ].join('|')
  const [pageState, setPageState] = useState({ key: pageKey, page: 1 })
  const page = pageState.key === pageKey ? pageState.page : 1
  const setPage = (p: number) => setPageState({ key: pageKey, page: p })

  const base = useMemo(() => evaluationRows(model), [model])
  const rows = useMemo(
    () => filterRows(base, { ...filters, search: debouncedSearch }),
    [base, filters, debouncedSearch],
  )

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const shown = rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  const onFilterChange = (patch: Partial<HistoryFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }))
  }

  return (
    <section aria-label="평가 이력">
      <h2>공개 평가 사이클 목록</h2>
      <p className="section-intro">실제 장비 이력이 아닌 공개 평가 데이터입니다.</p>
      <HistoryFilters
        filters={filters}
        onChange={onFilterChange}
        onDownload={() => exportHistoryCsv(rows, model)}
        downloadDisabled={!rows.length}
      />
      <Card>
        <h3 aria-live="polite">
          평가 전용 {num(base.length, 0)}행 · 현재 필터 {num(rows.length, 0)}행
        </h3>
        <HistoryTable rows={shown} />
        <Pager page={current} pageCount={pageCount} onChange={setPage} />
      </Card>
      <Notice warning style={{ marginTop: '18px' }}>
        xArm 저장 이력은 API 연결 후 제공됩니다. 유형·이상 여부는 평가용 정답이며 모델이 예측한
        값이 아닙니다.
      </Notice>
    </section>
  )
}

export default function HistoryPage() {
  const { mode } = useSource()
  return mode === 'public' ? <PublicHistory /> : <XarmPending />
}
