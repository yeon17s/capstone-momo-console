import { useCallback, useMemo } from 'react'
import { useCanvasChart } from '../../hooks/useCanvasChart'
import { drawDistribution, histogramData } from '../../lib/charts'
import { num } from '../../lib/format'
import type { CycleRow } from '../../types'

interface Props {
  rows: CycleRow[]
  threshold: number
}

export function ScoreDistributionChart({ rows, threshold }: Props) {
  const hist = useMemo(() => histogramData(rows), [rows])
  const draw = useCallback(
    (c: CanvasRenderingContext2D, w: number) => drawDistribution(c, w, hist, threshold),
    [hist, threshold],
  )
  const ref = useCanvasChart(300, draw)

  return (
    <>
      <canvas
        ref={ref}
        role="img"
        aria-label="실제 정상과 이상의 점수 히스토그램. 아래 설명 및 접힌 상세 표 참고."
      />
      <p className="caption">
        정상 {num(rows.filter((r) => !r.anomaly).length, 0)} / 이상{' '}
        {num(rows.filter((r) => r.anomaly).length, 0)} · 임계값 오른쪽은 이상 판정 · 구간별 건수
      </p>
    </>
  )
}
