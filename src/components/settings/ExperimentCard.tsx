import { CONFIG } from '../../data/db'
import { useModel } from '../../context/ModelContext'
import { num, pct } from '../../lib/format'
import { findModel } from '../../lib/selectors'
import { Card, Table } from '../common'

export function ExperimentCard() {
  const { model } = useModel()
  const m = findModel(model, 'all_12')
  return (
    <Card>
      <h2>Baseline 프로토콜</h2>
      <Table
        headers={['읽기 전용 항목', '공개 실험 설정']}
        rows={[
          ['현재 모델', [model.representation, model.input_set, model.algorithm].join(' / ')],
          ['모델 threshold', num(m?.threshold, 8)],
          ['판정 규칙', 'score > threshold'],
          ['학습 / 보정 / 평가', '정상 711 / 정상 237 / 정상 419 + 이상 755'],
          ['임계값 목표', '정상 보정 FPR 5% · 외부 배치 보장 없음'],
          ['시드', String(CONFIG.seed)],
          ['활성 Action', CONFIG.active_actions.join(', ')],
          ['PCA 설명 분산', pct(CONFIG.pca_explained_variance)],
          [
            'Isolation Forest',
            `${CONFIG.iforest_trees} trees / max_samples ${CONFIG.iforest_max_samples}`,
          ],
        ]}
      />
    </Card>
  )
}
