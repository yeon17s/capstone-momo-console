import { useMemo } from 'react'
import { DB } from '../../data/db'
import { useModel } from '../../context/ModelContext'
import { num } from '../../lib/format'
import { scopedRows, sameModel } from '../../lib/selectors'
import { COLORS } from '../../lib/charts'
import type { ModelRow } from '../../types'
import { Badge, Card } from '../common'
import { ConfusionMatrix, RecallChart, ScoreDistributionChart } from '../charts'

export function VisualSummary({ m, scope }: { m: ModelRow; scope: string }) {
  const { model } = useModel()
  const rows = useMemo(() => scopedRows(model, scope), [model, scope])
  const recallRows = useMemo(
    () =>
      DB.categories
        .filter((r) => sameModel(model)(r) && (scope === 'all_12' || [0, 1].includes(r.category)))
        .sort((a, b) => a.recall - b.recall),
    [model, scope],
  )

  return (
    <>
      <div className="title">
        <h2>한눈에 보는 평가 결과</h2>
        <Badge tone="blue">
          {(scope === 'all_12' ? '전체 12유형' : '마찰·무게 유형') + ' · 평가 ' + num(rows.length, 0) + '행'}
        </Badge>
      </div>
      <div className="viz-grid">
        <Card>
          <h2>정상·이상 점수 분포</h2>
          <div className="legend">
            <span>
              <i style={{ background: COLORS.normal }} />
              실제 정상
            </span>
            <span>
              <i style={{ background: COLORS.anomaly }} />
              실제 이상
            </span>
            <span>┆ threshold</span>
          </div>
          <ScoreDistributionChart rows={rows} threshold={m.threshold} />
        </Card>
        <Card>
          <h2>색상 혼동행렬</h2>
          <ConfusionMatrix m={m} />
        </Card>
        <Card className="wide">
          <h2>유형별 Recall · 낮은 탐지율 우선</h2>
          <RecallChart rows={recallRows} />
        </Card>
      </div>
    </>
  )
}
