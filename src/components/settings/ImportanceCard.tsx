import { useState } from 'react'
import { DB } from '../../data/db'
import { num, pct, uniq } from '../../lib/format'
import { Card, Notice, SelectField, Table } from '../common'

export function ImportanceCard() {
  const [protocol, setProtocol] = useState('setting')
  const [alg, setAlg] = useState('random_forest')
  const [input, setInput] = useState('full')

  const match = (r: { protocol: string; algorithm: string; input_set: string }) =>
    r.protocol === protocol && r.algorithm === alg && r.input_set === input

  const importance = DB.importance
    .filter(match)
    .sort((a, b) => (b.mean_importance ?? -Infinity) - (a.mean_importance ?? -Infinity))
    .slice(0, 20)

  const topk = DB.topk
    .filter(match)
    .sort(
      (a, b) =>
        (a.k === 'all' ? Infinity : Number(a.k)) - (b.k === 'all' ? Infinity : Number(b.k)),
    )

  const oof = DB.oof.filter(match)

  return (
    <Card style={{ marginTop: '18px' }}>
      <h2>특징 중요도 · Top-K</h2>
      <Notice warning>
        Baseline과 학습·분할·임계값이 달라 결과를 직접 비교할 수 없습니다.
      </Notice>
      <div className="subtools">
        <SelectField label="protocol" value={protocol} options={uniq(DB.importance, 'protocol')} onChange={setProtocol} />
        <SelectField label="algorithm" value={alg} options={uniq(DB.importance, 'algorithm')} onChange={setAlg} />
        <SelectField label="input_set" value={input} options={uniq(DB.importance, 'input_set')} onChange={setInput} />
      </div>

      <h3>불순도 감소 중요도 · MDI</h3>
      <Table
        headers={['특징 · MDI 상위 20', '평균 중요도', '표준편차', 'positive / observed folds', 'top10 folds', '평균 순위']}
        rows={importance.map((r) => [
          r.feature,
          num(r.mean_importance, 5),
          num(r.std_importance, 5),
          `${r.positive_folds} / ${r.observed_folds}`,
          num(r.top10_folds, 0),
          num(r.mean_rank_position, 2),
        ])}
      />
      <p className="caption">
        중요도는 물리적 원인을 뜻하지 않습니다.
      </p>

      <details open>
        <summary>Top-K · fold 평균 성능</summary>
        <Table
          headers={['K', 'fold 평균 AUROC ± SD', 'fold 평균 Recall', 'fold 평균 정상 FPR', '특징 수 min–max']}
          rows={topk.map((r) => [
            r.k,
            `${num(r.auroc_mean)} ± ${num(r.auroc_sd)}`,
            pct(r.recall_mean),
            pct(r.normal_fpr_mean),
            `${r.n_features_min}–${r.n_features_max}`,
          ])}
        />
        <p className="caption">
          fold 평균 값입니다.
        </p>
      </details>
      <details>
        <summary>정상 배치 OOF · 선택한 지도 프로토콜</summary>
        <Table
          headers={['OOF 정상 배치', '미관측 setting', '오탐 / 정상', 'FPR']}
          rows={oof.map((r) => [
            `${r.setting} · ${r.variant_name}`,
            r.unseen_setting === true ? '예' : r.unseen_setting === false ? '아니오' : '미정',
            `${r.false_positives} / ${r.n_normal}`,
            pct(r.normal_fpr),
          ])}
        />
        <p className="caption">
          배치 FPR 단순평균과 전체 가중 FPR은 다릅니다.
        </p>
      </details>
    </Card>
  )
}
