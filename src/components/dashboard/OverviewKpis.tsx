import { MetricCard, Notice } from '../common'

export function OverviewKpis() {
  return (
    <>
      <h2>데이터 개요</h2>
      <div className="kpis">
        <MetricCard label="공개 데이터 전체" value="2,122" sub="정상 1,367 / 이상 755" />
        <MetricCard label="Baseline 조건" value="18" sub="입력 3 × 평가 단위 2 × 알고리즘 3" />
        <MetricCard label="특징 그룹 Ablation" value="72" sub="탐색적 참고" />
        <MetricCard label="실측 xArm" value="별도 모드" sub="데이터 출처에서 xArm 선택" />
      </div>
      <Notice>
        이 화면은 Yu-Cobot 공개 평가 스냅샷만 사용합니다. xArm 데이터는 위 데이터 출처에서 xArm 모드를 선택하면 별도로 표시되며 이 수치와 섞지 않습니다.
      </Notice>
    </>
  )
}
