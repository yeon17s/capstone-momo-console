import { Badge, type BadgeTone } from '../common'

interface SourceMode {
  title: string
  description: string
  badge: string
  tone: BadgeTone
  active?: boolean
}

const SOURCES: SourceMode[] = [
  {
    title: '공개 평가 스냅샷',
    description: 'Yu-Cobot / voraus-AD 공개 평가 결과',
    badge: '현재 표시',
    tone: 'blue',
    active: true,
  },
  {
    title: 'xArm 저장 이력',
    description: '연결 전에는 표시하지 않습니다',
    badge: 'API 미연결',
    tone: 'warn',
  },
  {
    title: 'xArm 현재 상태',
    description: '연결 전에는 표시하지 않습니다',
    badge: 'API 미연결',
    tone: 'warn',
  },
]

export function SourceSwitch() {
  return (
    <div className="source-switch" role="group" aria-label="데이터 출처와 화면 범위">
      <div className="source-switch-label">
        <strong>데이터 출처</strong>
        <span>공개 평가 자료와 xArm 기록은 섞어 표시하지 않습니다.</span>
      </div>
      {SOURCES.map((s) => (
        <div
          key={s.title}
          className={s.active ? 'source-mode is-active' : 'source-mode'}
          aria-current={s.active ? 'true' : undefined}
        >
          <div className="source-mode-head">
            <strong>{s.title}</strong>
            <Badge tone={s.tone}>{s.badge}</Badge>
          </div>
          <p>{s.description}</p>
        </div>
      ))}
    </div>
  )
}
