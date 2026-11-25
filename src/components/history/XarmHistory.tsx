import { useEffect, useMemo, useState } from 'react'
import { useApi } from '../../context/ApiContext'
import { numberLabel } from '../../lib/api'
import {
  buildCyclesQuery,
  EMPTY_FILTERS,
  type XarmFilterState,
} from '../../lib/api/historyFilters'
import type { CsvInfo } from '../../types/api'
import { AsyncState, Card, Notice } from '../common'
import { Pager } from './Pager'
import { XarmHistoryFilters } from './XarmHistoryFilters'
import { XarmHistoryTable } from './XarmHistoryTable'

type CsvState =
  | { phase: 'idle' }
  | { phase: 'checking' }
  | { phase: 'ready'; info: CsvInfo }
  | { phase: 'error'; message: string }

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function XarmHistory() {
  const { client, cycles } = useApi()
  const [filters, setFilters] = useState<XarmFilterState>(EMPTY_FILTERS)
  const [offset, setOffset] = useState(0)
  const [limit, setLimit] = useState(25)
  const [search, setSearch] = useState('')
  const [csv, setCsv] = useState<{ key: string; state: CsvState }>({ key: '', state: { phase: 'idle' } })
  const [applied, setApplied] = useState<{ key: string; error: string | null }>({ key: '', error: null })

  const built = useMemo(() => buildCyclesQuery(filters, offset, limit), [filters, offset, limit])
  const queryKey = JSON.stringify(built.query ?? { error: built.error })

  useEffect(() => {
    if (!client || !built.query) return
    let cancelled = false
    client
      .setHistoryQuery(built.query)
      .then(() => !cancelled && setApplied({ key: queryKey, error: null }))
      .catch((e: unknown) => !cancelled && setApplied({ key: queryKey, error: message(e) }))
    return () => {
      cancelled = true
    }
  }, [client, built.query, queryKey])

  const patchFilters = (patch: Partial<XarmFilterState>) => {
    setFilters((f) => ({ ...f, ...patch }))
    setOffset(0)
  }

  const csvState: CsvState = csv.key === queryKey ? csv.state : { phase: 'idle' }
  const checkCsv = async () => {
    if (!client || !built.query) return
    const key = queryKey
    setCsv({ key, state: { phase: 'checking' } })
    try {
      const info = await client.csvInfo(built.query)
      setCsv({ key, state: { phase: 'ready', info } })
    } catch (e) {
      setCsv({ key, state: { phase: 'error', message: message(e) } })
    }
  }

  const loaded = applied.key === queryKey
  const total = cycles?.total ?? 0
  const pageSize = cycles?.limit ?? limit
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.floor(offset / limit) + 1
  const items = cycles?.items ?? []
  const q = search.trim().toLowerCase()
  const shown = q
    ? items.filter((c) =>
        [c.run_id, c.condition, c.operator?.label, c.model_profile, c.source_group, c.data_kind, c.captured_utc]
          .map((v) => String(v ?? '').toLowerCase())
          .some((v) => v.includes(q)),
      )
    : items

  return (
    <section aria-label="xArm 저장 이력">
      <h2>xArm 저장 이력</h2>
      <p className="section-intro">
        서버가 저장한 기록입니다. 최신 수집 시각 순이며, 서버 연결이 현재 운전 중이라는 뜻은 아닙니다.
      </p>
      <XarmHistoryFilters
        filters={filters}
        onChange={patchFilters}
        onReset={() => patchFilters(EMPTY_FILTERS)}
        limit={limit}
        onLimit={(n) => {
          setLimit(n)
          setOffset(0)
        }}
        search={search}
        onSearch={setSearch}
        items={items}
      />
      {built.error && <AsyncState kind="error">{built.error}</AsyncState>}
      <Card>
        <h3 aria-live="polite">
          {loaded && !applied.error && cycles
            ? `필터 결과 ${numberLabel(total, 0)}건 중 ${numberLabel(cycles.offset + (items.length ? 1 : 0), 0)}–${numberLabel(cycles.offset + items.length, 0)}`
            : '이력'}
        </h3>
        {!built.error && !loaded && <AsyncState kind="loading" />}
        {loaded && applied.error && <AsyncState kind="error">{applied.error}</AsyncState>}
        {loaded && !applied.error && cycles && (
          <>
            {items.length === 0 && total > 0 ? (
              <AsyncState kind="empty">
                페이지 범위를 벗어났습니다. 기록이 줄었을 수 있습니다.{' '}
                <button type="button" onClick={() => setOffset(0)}>
                  첫 페이지로
                </button>
              </AsyncState>
            ) : (
              <XarmHistoryTable items={shown} />
            )}
            {q && (
              <p className="caption">
                현재 페이지 {items.length}행 안에서만 검색한 결과 {shown.length}행입니다. 전체 결과가
                아닙니다.
              </p>
            )}
            <Pager
              page={page}
              pageCount={pageCount}
              onChange={(p) => setOffset((p - 1) * limit)}
            />
          </>
        )}
        <p className="caption">
          기록 건수는 동작 0 사전검사 기록을 포함할 수 있어 운행 횟수가 아닙니다. 서버가 지원하지 않는
          전체 검색·점수 정렬은 제공하지 않습니다.
        </p>
      </Card>

      <Card style={{ marginTop: '18px' }}>
        <h3>CSV 저장 (같은 필터 전체)</h3>
        <p className="caption" style={{ marginTop: 0 }}>
          현재 페이지가 아니라 위 필터에 해당하는 전체 이력입니다. 먼저 행 수와 서버 상한을 확인합니다.
        </p>
        <button type="button" onClick={checkCsv} disabled={!client || !built.query || csvState.phase === 'checking'}>
          {csvState.phase === 'checking' ? '확인 중…' : 'CSV 준비'}
        </button>
        {csvState.phase === 'error' && <AsyncState kind="error">{csvState.message}</AsyncState>}
        {csvState.phase === 'ready' && (
          <div style={{ marginTop: '14px' }}>
            {csvState.info.truncated ? (
              <Notice warning>
                서버 행 상한을 넘었습니다. 전체 {numberLabel(csvState.info.total, 0)}행 중{' '}
                {numberLabel(csvState.info.rows, 0)}행만 포함되며 <strong>전체 이력이 아닙니다.</strong>{' '}
                날짜 또는 세션(run_id) 필터로 나누어 저장하세요.
              </Notice>
            ) : (
              <Notice>
                {numberLabel(csvState.info.rows, 0)}행 (전체 {numberLabel(csvState.info.total, 0)}행) 저장
                가능합니다.
              </Notice>
            )}
            <a href={csvState.info.url} download>
              {csvState.info.truncated ? '잘린 CSV 내려받기 (일부만 포함)' : 'CSV 내려받기'}
            </a>
            <p className="caption">
              확인 요청과 다운로드는 서로 다른 시점의 조회라 새 회차가 추가되면 행 수가 달라질 수
              있습니다. CSV의 실제 라벨과 모델 유형·보조 유형 열은 합치지 않습니다.
            </p>
          </div>
        )}
      </Card>
    </section>
  )
}
