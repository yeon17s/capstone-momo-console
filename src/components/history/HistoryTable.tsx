import { useComparison } from '../../context/ComparisonContext'
import { dash, num } from '../../lib/format'
import type { CycleRow } from '../../types'
import { StateBadge, Table } from '../common'

export function HistoryTable({ rows }: { rows: CycleRow[] }) {
  const { add } = useComparison()
  return (
    <Table
      headers={['sample', '실제 유형 라벨', '실제 정상/이상', '모델 판정', 'score', 'threshold', '실험 조건', '상세']}
      rows={rows.map((r) => [
        dash(r.sample),
        dash(r.category_name),
        <StateBadge key="anomaly" value={r.anomaly} />,
        <StateBadge key="prediction" value={r.prediction} />,
        num(r.score, 6),
        num(r.threshold, 6),
        `${dash(r.setting)} · ${dash(r.variant_name)}`,
        <button key="open" className="detail" onClick={() => add(r)}>
          열기
        </button>,
      ])}
    />
  )
}
