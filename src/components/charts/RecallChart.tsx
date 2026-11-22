import { useCallback } from 'react'
import { useCanvasChart } from '../../hooks/useCanvasChart'
import { drawRecall, recallChartHeight } from '../../lib/charts'
import type { CategoryRow } from '../../types'

/** `rows` 는 Recall 오름차순으로 정렬되어 있어야 한다. */
export function RecallChart({ rows }: { rows: CategoryRow[] }) {
  const height = recallChartHeight(rows.length)
  const draw = useCallback(
    (c: CanvasRenderingContext2D, w: number, h: number) => drawRecall(c, w, h, rows),
    [rows],
  )
  const ref = useCanvasChart(height, draw)

  return (
    <>
      <canvas
        ref={ref}
        role="img"
        aria-label="유형별 Recall 막대그래프. 정확한 수치는 아래 유형별 평가 상세 표 참고."
      />
      <p className="caption">
        낮은 Recall부터 정렬 · {rows.length}유형
      </p>
    </>
  )
}
