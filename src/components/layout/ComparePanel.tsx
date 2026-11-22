import { useEffect, useState, type ReactNode } from 'react'
import { useComparison } from '../../context/ComparisonContext'
import { dash, num } from '../../lib/format'
import { outcome } from '../../lib/selectors'
import type { CycleRow } from '../../types'
import { StateBadge } from '../common'

const FIELDS: [string, (r: CycleRow) => ReactNode][] = [
  ['모델', (r) => [r.representation, r.input_set, r.algorithm].join(' / ')],
  ['실제 유형', (r) => r.category_name],
  ['실제 라벨', (r) => <StateBadge value={r.anomaly} />],
  ['모델 판정', (r) => <StateBadge value={r.prediction} />],
  ['평가 결과', (r) => outcome(r)],
  ['score', (r) => num(r.score, 8)],
  ['threshold', (r) => num(r.threshold, 8)],
  [
    'score − threshold',
    (r) =>
      Number.isFinite(r.score) && Number.isFinite(r.threshold) ? num(r.score - r.threshold, 8) : '—',
  ],
  ['실험 조건', (r) => `${dash(r.setting)} / ${dash(r.variant_name)}`],
  ['split', (r) => r.split],
]

export function ComparePanel() {
  const { items, open, message, remove, close } = useComparison()
  const [folded, setFolded] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [close])

  return (
    <aside id="comparePanel" role="region" aria-labelledby="compareTitle" hidden={!open}>
      <div className="compare-header">
        <h2 id="compareTitle">사이클 상세 비교 · 최대 2개</h2>
        <div>
          <button
            aria-expanded={!folded}
            aria-controls="compareBody"
            onClick={() => setFolded((f) => !f)}
          >
            {folded ? '펼치기' : '접기'}
          </button>{' '}
          <button onClick={close}>창 닫기</button>
        </div>
      </div>
      <div id="compareBody" hidden={folded}>
        <p role="status" aria-live="polite">
          {message}
        </p>
        {items.length ? (
          <div className={items.length === 2 ? 'compare-grid two' : 'compare-grid'}>
            {items.map((r, i) => (
              <article key={`${r.sample}/${r.input_set}`} className="compare-item">
                <div className="compare-item-head">
                  <h3>sample {r.sample}</h3>
                  <button
                    aria-label={`sample ${r.sample} 비교에서 제거`}
                    onClick={() => remove(i)}
                  >
                    항목 닫기
                  </button>
                </div>
                <dl>
                  {FIELDS.map(([title, render]) => (
                    <div key={title} className="compare-field">
                      <dt>{title}</dt>
                      <dd>{render(r)}</dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">목록에서 ‘열기’를 눌러 비교할 결과를 추가하세요.</p>
        )}
        <p className="caption">모델이 다르면 score의 크기를 직접 비교할 수 없습니다.</p>
      </div>
    </aside>
  )
}
