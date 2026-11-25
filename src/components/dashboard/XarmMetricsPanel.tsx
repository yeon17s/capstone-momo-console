import { useMetrics } from '../../hooks/useMetrics'
import { numberLabel } from '../../lib/api'
import { flattenJson } from '../../lib/api/flatten'
import { AsyncState, Card, MetricCard, Notice, Table } from '../common'

const COUNT_KEYS = [
  ['confirmed_total', '확인된 실제 라벨', '실제 관찰로 확인된 회차'],
  ['confirmed_scored', '평가 분모', '확인 라벨 중 경보 판정이 있는 회차'],
  ['confirmed_unavailable', '판정 불가', '확인 라벨은 있으나 경보 없음'],
  ['normal_scored', '정상 평가', 'FPR 분모'],
  ['anomaly_scored', '이상 평가', '탐지율 분모'],
  ['pending_or_unclassified_truth', '미확정/미분류 정답', '평가에서 제외'],
  ['excluded_no_motion', '동작 0 제외', '운행 횟수가 아님'],
] as const

export function XarmMetricsPanel() {
  const { data, error } = useMetrics()
  const known = new Set<string>(COUNT_KEYS.map(([k]) => k))
  const rest = data ? flattenJson(Object.fromEntries(Object.entries(data).filter(([k]) => !known.has(k)))) : []

  return (
    <section aria-label="평가 지표">
      <h2>확인된 실제 라벨 기준 평가</h2>
      <Notice>
        적용 범위: 서버 전체 기록 (날짜·세션·출처·모델 필터 없음). 정답이 확인되지 않은 회차는 정상으로
        채우지 않고 분모에서 제외합니다. 라벨이 없으면 실시간 정확도·FPR을 만들지 않습니다.
      </Notice>
      {error && <AsyncState kind="error">{error}</AsyncState>}
      {!data && !error && <AsyncState kind="loading" />}
      {data && (
        <div className="stack">
          <div className="kpis">
            {COUNT_KEYS.map(([key, label, sub]) => (
              <MetricCard key={key} label={label} value={numberLabel(data[key], 0)} sub={sub} />
            ))}
          </div>
          <Card>
            <h3>정상 FPR · 유형별 탐지율 등 (서버 응답)</h3>
            <Table
              headers={['항목', '값']}
              rows={rest.map((r) => [<code key="p">{r.path}</code>, r.value])}
            />
            <p className="caption">
              분모가 0이면 비율은 null(미제공)이며 0%가 아닙니다. 이 지표는 xArm 확인 라벨 범위의
              탐색적 집계이며 공개 평가 성능과 섞지 않습니다.
            </p>
          </Card>
        </div>
      )}
    </section>
  )
}
