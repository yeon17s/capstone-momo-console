import { XarmModelsCard, XarmPolicyNotes } from './XarmModelsCard'

export function XarmSettings() {
  return (
    <section aria-label="xArm 모델 설정">
      <h2>xArm 모델 프로필 (읽기 전용)</h2>
      <p className="section-intro">
        서버의 <code>/api/v1/models</code> 응답입니다. 공개 평가의 입력군 A/B/C와 xArm 이상 A121 ·
        B82 · C182는 뜻이 다릅니다. 현재 xArm은 관절 iq·개별 전류·속도/추종오차·서보 온도를
        수집하지 않습니다.
      </p>
      <div className="stack">
        <XarmModelsCard />
        <XarmPolicyNotes />
      </div>
    </section>
  )
}
