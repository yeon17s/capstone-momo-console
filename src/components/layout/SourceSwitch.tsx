import { useApi } from '../../context/ApiContext'
import { useSource, type SourceMode } from '../../context/SourceContext'
import { CONNECTION_VIEW } from '../../lib/api/connection'
import { Badge, type BadgeTone } from '../common'

interface SourceItem {
  mode: SourceMode
  title: string
  description: string
}

const SOURCES: SourceItem[] = [
  {
    mode: 'public',
    title: '공개 평가 스냅샷',
    description: 'Yu-Cobot / voraus-AD 공개 평가 결과',
  },
  {
    mode: 'xarm-history',
    title: 'xArm 저장 이력',
    description: '저장된 기록입니다. 서버 연결은 현재 운전 중이라는 뜻이 아닙니다.',
  },
  {
    mode: 'xarm-live',
    title: 'xArm 현재 상태',
    description: '로그 갱신 관찰입니다. 장비 안전·운전·운반 성공을 보증하지 않습니다.',
  },
]

export function SourceSwitch() {
  const { mode, setMode } = useSource()
  const { connection } = useApi()

  const badgeFor = (item: SourceItem): { text: string; tone: BadgeTone } => {
    if (item.mode !== mode) {
      return item.mode === 'public'
        ? { text: '선택', tone: '' }
        : { text: '선택하면 연결', tone: '' }
    }
    if (item.mode === 'public') return { text: '현재 표시', tone: 'blue' }
    const v = CONNECTION_VIEW[connection]
    return { text: v.label, tone: v.tone }
  }

  return (
    <div className="source-switch" role="group" aria-label="데이터 출처와 화면 범위">
      <div className="source-switch-label">
        <strong>데이터 출처</strong>
        <span>공개 평가 자료와 xArm 기록은 섞어 표시하지 않습니다.</span>
      </div>
      {SOURCES.map((s) => {
        const active = s.mode === mode
        const badge = badgeFor(s)
        return (
          <button
            key={s.mode}
            type="button"
            className={active ? 'source-mode is-active' : 'source-mode'}
            aria-pressed={active}
            onClick={() => setMode(s.mode)}
          >
            <span className="source-mode-head">
              <strong>{s.title}</strong>
              <Badge tone={badge.tone}>{badge.text}</Badge>
            </span>
            <p>{s.description}</p>
          </button>
        )
      })}
    </div>
  )
}
