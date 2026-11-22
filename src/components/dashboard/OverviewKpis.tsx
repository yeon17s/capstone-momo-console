import { MetricCard, Notice } from '../common'

export function OverviewKpis() {
  return (
    <>
      <h2>데이터 개요</h2>
      <div className="kpis">
        <MetricCard label="공개 데이터 전체" value="2,122" sub="정상 1,367 / 이상 755" />
        <MetricCard label="Baseline 조건" value="18" sub="입력 3 × 평가 단위 2 × 알고리즘 3" />
        <MetricCard label="특징 그룹 Ablation" value="72" sub="탐색적 참고" />
        <MetricCard label="실측 xArm" value="미연결" sub="API 연결 필요" />
      </div>
      <Notice>
        이 화면은 Yu-Cobot 공개 평가 스냅샷만 사용합니다. xArm 데이터는 API 연결 후 제공됩니다.
      </Notice>
    </>
  )
}
