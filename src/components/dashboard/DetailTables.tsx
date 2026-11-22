import { DB } from '../../data/db'
import { useModel } from '../../context/ModelContext'
import { num, pct } from '../../lib/format'
import { sameModel } from '../../lib/selectors'
import type { ModelRow } from '../../types'
import { Card, Empty, Table } from '../common'

export function DetailTables({ m }: { m: ModelRow | undefined }) {
  const { model } = useModel()
  const same = sameModel(model)

  return (
    <>
      <h2 style={{ marginTop: '26px' }}>상세 평가 데이터</h2>
      <div className="stack">
        <Card className="detail-toggle" as="details">
          <summary>혼동행렬</summary>
          {m ? (
            <>
              <Table
                headers={['실제 라벨 / 모델 판정', '정상 판정', '이상 판정']}
                rows={[
                  ['정상', 'TN ' + num(m.tn, 0), 'FP ' + num(m.fp, 0)],
                  ['이상', 'FN ' + num(m.fn, 0), 'TP ' + num(m.tp, 0)],
                ]}
              />
              <p className="muted">
                평가 정상 {num(m.n_normal, 0)} / 이상 {num(m.n_anomaly, 0)} · 합계{' '}
                {num(m.tn + m.fp + m.fn + m.tp, 0)}
              </p>
            </>
          ) : (
            <Empty>미평가 조건</Empty>
          )}
        </Card>
        <Card className="detail-toggle" as="details">
          <summary>정상 배치별 오탐</summary>
          <Table
            headers={['정상 배치', '오탐 / 분모', 'FPR', '원본 CI 하한–상한']}
            rows={DB.batches
              .filter(same)
              .map((r) => [
                `${r.setting} · ${r.variant}`,
                `${r.false_positives} / ${r.n_normal}`,
                pct(r.normal_fpr),
                `${pct(r.fpr_ci_low)} – ${pct(r.fpr_ci_high)}`,
              ])}
          />
          <p className="caption">scope와 관계없이 동일한 정상 평가 집합입니다.</p>
        </Card>
        <Card className="detail-toggle" as="details">
          <summary>유형별 평가</summary>
          <Table
            headers={['실제 유형 라벨', '이상 수', 'AUROC', 'PR-AUC · AP', 'Recall', '공유 정상 수']}
            rows={DB.categories
              .filter(same)
              .map((r) => [
                `${r.category} · ${r.category_name}`,
                num(r.n_anomaly, 0),
                num(r.auroc),
                num(r.pr_auc_ap),
                pct(r.recall),
                num(r.n_normal, 0),
              ])}
          />
          {m && (
            <p className="caption">
              보정 FPR {pct(m.validation_fpr)} (목표 5%) · 외부 배치에서는 보장되지 않습니다. 각
              행의 정상 419개는 같은 집합이므로 합산하지 마세요.
            </p>
          )}
        </Card>
      </div>
    </>
  )
}
