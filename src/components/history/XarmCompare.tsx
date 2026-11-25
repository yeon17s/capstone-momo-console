import { useMemo, useState } from 'react'
import { useCycleDetail, type CycleDetail } from '../../hooks/useCycleDetail'
import { alarmLabel, numberLabel, typeLabel } from '../../lib/api'
import { flattenJson } from '../../lib/api/flatten'
import { buildIndexLine, buildLines, numericColumns, type Row } from '../../lib/api/series'
import type { Cycle } from '../../types/api'
import { LineChart } from '../charts'
import { AsyncState, Badge, Card, Notice, Table } from '../common'

function text(v: unknown): string {
  return v === null || v === undefined || v === '' ? '미제공' : String(v)
}

function SeriesViewer({ rows, stream }: { rows: Row[]; stream: string }) {
  const columns = useMemo(() => numericColumns(rows), [rows])
  const [picked, setPicked] = useState('')
  const column = columns.includes(picked) ? picked : (columns[0] ?? '')
  const built = useMemo(() => (column ? buildLines(rows, column) : { lines: [], skipped: 0 }), [rows, column])

  if (!rows.length) return <AsyncState kind="empty">이 스트림에 저장된 행이 없습니다.</AsyncState>
  if (!columns.length) return <AsyncState kind="empty">그릴 수 있는 숫자 열이 없습니다.</AsyncState>
  return (
    <div>
      <label>
        채널 (열)
        <select value={column} onChange={(e) => setPicked(e.target.value)}>
          {columns.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <LineChart lines={built.lines} xLabel="t_s (No.3 시작 기준 초)" label={`${stream} ${column} 시계열`} />
      <p className="caption">
        {rows.length}행{built.skipped ? ` · t_s 없는 ${built.skipped}행은 그리지 않음` : ''}. 값이 없거나 간격이
        크게 벌어진 구간은 선을 이어 그리지 않고 끊어 표시합니다.
      </p>
    </div>
  )
}

function Waveforms({ detail }: { detail: CycleDetail }) {
  const { series, loading, error, reload } = detail
  const streams = series ? (Object.keys(series.series) as (keyof typeof series.series)[]) : []
  const [picked, setPicked] = useState('')
  const stream = streams.find((s) => s === picked) ?? streams[0]
  return (
    <div>
      <h4>상세 파형</h4>
      <Notice>
        열기 시점의 저장 스냅샷입니다. 자동으로 갱신되는 실시간 그래프가 아닙니다.{' '}
        <button type="button" onClick={reload}>
          다시 읽기
        </button>
      </Notice>
      {loading && <AsyncState kind="loading" />}
      {error && <AsyncState kind="error">{error}</AsyncState>}
      {series && (
        <>
          {series.truncated && (
            <AsyncState kind="stale">
              응답 행 상한으로 잘렸습니다(limit {series.limit}). 일부 구간만 표시됩니다.
            </AsyncState>
          )}
          {streams.length === 0 ? (
            <AsyncState kind="empty">저장된 파형이 없습니다.</AsyncState>
          ) : (
            <>
              <label>
                스트림
                <select value={stream} onChange={(e) => setPicked(e.target.value)}>
                  {streams.map((s) => (
                    <option key={s} value={s}>
                      {s} ({series.series[s]?.length ?? 0}행)
                    </option>
                  ))}
                </select>
              </label>
              {stream && <SeriesViewer key={stream} rows={(series.series[stream] ?? []) as Row[]} stream={stream} />}
            </>
          )}
          {series.source_quality && (
            <details>
              <summary>source_quality (관측/보존 건수)</summary>
              <Table
                headers={['항목', '값']}
                rows={flattenJson(series.source_quality).map((r) => [<code key="p">{r.path}</code>, r.value])}
              />
            </details>
          )}
          <p className="caption">
            예측·잔차는 모델이 낸 값이며 실측과 구분해 봅니다. 명목 200ms와 실제 발행 간격·누락 수는 별개입니다.
          </p>
        </>
      )}
    </div>
  )
}

function Trends({ detail }: { detail: CycleDetail }) {
  const { trends, cycle, loading } = detail
  const points = useMemo(() => (trends?.points ?? []) as Row[], [trends])
  const columns = useMemo(() => numericColumns(points), [points])
  const [picked, setPicked] = useState('')
  const column = columns.includes(picked) ? picked : (columns[0] ?? '')
  const line = useMemo(() => (column ? buildIndexLine(points, column) : null), [points, column])

  if (loading) return null
  if (!cycle?.run_id) return <AsyncState kind="no_data">run_id가 없어 추세를 조회하지 않았습니다.</AsyncState>
  if (!trends) return null
  return (
    <div>
      <h4>
        같은 run의 추세 <Badge tone="blue">/trends</Badge>
      </h4>
      <p className="caption" style={{ marginTop: 0 }}>
        points {trends.points.length} / total {trends.total} (limit {trends.limit})
        {trends.truncated ? ' · 잘림' : ''}
      </p>
      {trends.truncated && <AsyncState kind="stale">상한으로 잘려 일부 회차만 포함됩니다.</AsyncState>}
      {line ? (
        <>
          <label>
            항목
            <select value={column} onChange={(e) => setPicked(e.target.value)}>
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <LineChart lines={[line]} xLabel="시간순 회차 (응답 순서)" label={`추세 ${column}`} />
          <p className="caption">
            statistics.available=false 인 회차는 평균/RMS가 없는 것이며 마지막 센서값으로 채우지 않고 끊어
            표시합니다.
          </p>
        </>
      ) : (
        <AsyncState kind="empty">그릴 수 있는 숫자 항목이 없습니다.</AsyncState>
      )}
    </div>
  )
}

function Summary({ c }: { c: Cycle }) {
  const op = c.operator
  const stats = c.statistics
  return (
    <>
      <Table
        headers={['구분', '값']}
        rows={[
          ['수집 시각 (UTC)', text(c.captured_utc)],
          ['run · 회차', `${text(c.run_id)} · ${text(c.cycle?.index)}`],
          ['계획 조건 (정답 아님)', text(c.condition)],
          ['실제 확인 / 라벨', `${op?.confirmed == null ? '미확정' : op.confirmed ? '확인됨' : '미확정'} / ${text(op?.label)}`],
          ['원 경보', alarmLabel(c.detectors?.combined?.alarm)],
          ['원 유형', typeLabel(c.detectors?.combined?.type)],
          ['보조 추정', typeLabel(c.auxiliary?.estimated_type)],
          [
            '모델 프로필',
            <>
              <code>{text(c.model_profile)}</code>
              {c.model_profile === 'old_logistic_gru' && (
                <>
                  {' '}
                  <Badge tone="warn">과거 로지스틱/GRU</Badge>
                </>
              )}
            </>,
          ],
          ['freshness', `${text(c.freshness.status)} · age ${numberLabel(c.freshness.age_s, 1)} s`],
        ]}
      />
      {stats?.available === false ? (
        <p className="caption">회차 통계(평균/RMS): 미제공 (완전한 No.3 구간이 아님).</p>
      ) : stats ? (
        <details>
          <summary>회차 통계 (No.3 구간)</summary>
          <Table headers={['항목', '값']} rows={flattenJson(stats).map((r) => [<code key="p">{r.path}</code>, r.value])} />
        </details>
      ) : null}
    </>
  )
}

function CompareItem({ id, onRemove }: { id: string; onRemove: () => void }) {
  const detail = useCycleDetail(id)
  const { cycle, loading, error } = detail
  return (
    <article className="compare-item">
      <div className="compare-item-head">
        <h3>회차 상세</h3>
        <button type="button" onClick={onRemove}>
          항목 닫기
        </button>
      </div>
      {loading && <AsyncState kind="loading" />}
      {error && <AsyncState kind="error">{error}</AsyncState>}
      {cycle && <Summary c={cycle} />}
      <Waveforms detail={detail} />
      <Trends detail={detail} />
    </article>
  )
}

export function XarmCompare({ ids, onRemove }: { ids: string[]; onRemove: (id: string) => void }) {
  if (!ids.length) return null
  return (
    <Card style={{ marginTop: '18px' }}>
      <h3>회차 상세 · 비교 (최대 2개)</h3>
      <div className={ids.length === 2 ? 'compare-grid two' : 'compare-grid'}>
        {ids.map((id) => (
          <CompareItem key={id} id={id} onRemove={() => onRemove(id)} />
        ))}
      </div>
      <p className="caption">
        서로 다른 회차·모델의 점수 크기를 직접 비교하지 않습니다. 실제 라벨과 모델 유형은 별도 항목입니다.
      </p>
    </Card>
  )
}
