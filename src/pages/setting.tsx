import { useSource } from '../context/SourceContext'
import {
  AblationCard,
  DeviceNoticeCard,
  ExperimentCard,
  ImportanceCard,
  XarmSettings,
} from '../components/settings'

function PublicSettings() {
  return (
    <section aria-label="설정 및 분석 확장">
      <h2>읽기 전용 실험 설정</h2>
      <p className="section-intro">공개 실험 설정을 확인하는 화면입니다. 값은 변경할 수 없습니다.</p>
      <div className="grid">
        <ExperimentCard />
        <DeviceNoticeCard />
      </div>
      <AblationCard />
      <ImportanceCard />
    </section>
  )
}

export default function SettingPage() {
  const { mode } = useSource()
  return mode === 'public' ? <PublicSettings /> : <XarmSettings />
}
