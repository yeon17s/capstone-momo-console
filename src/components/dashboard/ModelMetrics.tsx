import { num, pct } from '../../lib/format'
import type { ModelRow } from '../../types'
import { MetricCard } from '../common'

export function ModelMetrics({ m }: { m: ModelRow }) {
  return (
    <div className="kpis">
      <MetricCard label="전체 AUROC" value={num(m.auroc)} sub="전체 평가 집합" />
      <MetricCard
        label="유형 평균 AUROC"
        value={num(m.macro_category_auroc)}
        sub="Macro-category · 단순평균"
      />
      <MetricCard label="PR-AUC · AP" value={num(m.pr_auc_ap)} sub="Average Precision" />
      <MetricCard label="이상 Recall" value={pct(m.recall)} sub="TP / (TP + FN)" />
      <MetricCard
        label="정상 FPR"
        value={pct(m.normal_fpr)}
        sub={`${m.fp} / ${m.n_normal} 정상 오탐`}
      />
      <MetricCard
        label="모델별 threshold"
        value={num(m.threshold, 6)}
        sub="score > threshold → 이상"
      />
    </div>
  )
}
