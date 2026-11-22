import { Fragment } from 'react'
import { num, pct } from '../../lib/format'
import type { ModelRow } from '../../types'

type Key = 'TN' | 'FP' | 'FN' | 'TP'

const TITLES: Record<Key, string> = {
  TN: '정상 판정 성공',
  FP: '오탐 · 잘못된 경보',
  FN: '미탐 · 이상을 놓침',
  TP: '이상 탐지 성공',
}

const GOOD = '#3FBF37'
const WARN = '#E0B534'
const BAD = '#E05A62'

export function ConfusionMatrix({ m }: { m: ModelRow }) {
  const cells: [Key, string, number, number, string][] = [
    ['TN', '정상 → 정상', m.tn, m.n_normal, GOOD],
    ['FP', '정상 → 이상 · 오탐', m.fp, m.n_normal, WARN],
    ['FN', '이상 → 정상 · 미탐', m.fn, m.n_anomaly, BAD],
    ['TP', '이상 → 이상 · 탐지', m.tp, m.n_anomaly, GOOD],
  ]

  return (
    <>
      <div className="matrix-head">
        <span>실제 ↓ / 모델 →</span>
        <span>정상으로 판정</span>
        <span>이상으로 판정</span>
      </div>
      <div className="matrix-grid" role="group" aria-label="실제 상태와 모델 판정 비교">
        {cells.map(([key, label, v, total, color], index) => (
          <Fragment key={key}>
            {index === 0 && (
              <div className="matrix-row-label">
                실제
                <br />
                정상
              </div>
            )}
            {index === 2 && (
              <div className="matrix-row-label">
                실제
                <br />
                이상
              </div>
            )}
            <div className="matrix-cell" style={{ borderTopColor: color }}>
              <h3>{TITLES[key]}</h3>
              <small>{`${key} · ${label}`}</small>
              <strong>
                {num(v, 0)}
                <small style={{ display: 'inline' }}> 건</small>
              </strong>
              <small>
                실제 {key === 'TN' || key === 'FP' ? '정상' : '이상'} {num(total, 0)}건 중{' '}
                {pct(total ? v / total : null)}
              </small>
            </div>
          </Fragment>
        ))}
      </div>
      <p className="caption">초록: 맞힌 결과 · 노랑: 정상인데 경보 · 빨강: 이상을 놓침</p>
    </>
  )
}
