import { useState } from 'react'
import { RESEARCH } from '../../data/research'
import { num, pct, uniq } from '../../lib/format'
import { Card, SelectField, Table } from '../common'

export function AblationCard() {
  const [rep, setRep] = useState('cycle')
  const [alg, setAlg] = useState('statistical')
  const [combo, setCombo] = useState('')

  const rows = RESEARCH.groups.filter(
    (r) => r.representation === rep && r.algorithm === alg && (!combo || r.combination === combo),
  )

  return (
    <Card>
      <h2>특징 그룹 Ablation</h2>
      <p className="section-intro">
        G0 전류·전압 / G1 위치 / G2 속도 / G3 위치오차 / G4 속도오차 / G5 관절 iq
      </p>
      <div className="subtools">
        <SelectField label="평가 단위" value={rep} options={uniq(RESEARCH.groups, 'representation')} onChange={setRep} />
        <SelectField label="알고리즘" value={alg} options={uniq(RESEARCH.groups, 'algorithm')} onChange={setAlg} />
        <SelectField
          label="조합"
          value={combo}
          options={uniq(RESEARCH.groups, 'combination')}
          onChange={setCombo}
          emptyLabel="모든 조합"
        />
      </div>
      <Table
        headers={['combination', '입력 신호 / 유지 특징', '전체 AUROC', '유형 평균 AUROC', 'Recall', '정상 FPR', 'threshold']}
        rows={rows.map((r) => [
          r.combination,
          `${r.n_signals} / ${r.retained_features}`,
          num(r.auroc),
          num(r.macro_category_auroc),
          pct(r.recall),
          pct(r.normal_fpr),
          num(r.threshold, 5),
        ])}
      />
    </Card>
  )
}
