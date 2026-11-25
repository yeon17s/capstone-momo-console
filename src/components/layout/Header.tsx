import { NavLink } from 'react-router-dom'
import { useApi } from '../../context/ApiContext'
import { useSource } from '../../context/SourceContext'
import { CONNECTION_VIEW } from '../../lib/api/connection'
import { Badge } from '../common'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
]

const MODE_LABEL = {
  public: '공개 평가 스냅샷',
  'xarm-history': 'xArm 저장 이력',
  'xarm-live': 'xArm 현재 상태',
} as const

export function Header() {
  const { mode } = useSource()
  const { connection } = useApi()
  const view = CONNECTION_VIEW[connection]
  return (
    <header>
      <div className="brand">
        MOmO <em>/</em> ROBOT ANALYTICS
        <small>{mode === 'public' ? '공개 데이터 분석 콘솔' : 'xArm 읽기 전용 콘솔'}</small>
      </div>
      <nav aria-label="주요 화면">
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="header-badges">
        <Badge tone="blue">{MODE_LABEL[mode]}</Badge>
        {mode !== 'public' && <Badge tone={view.tone}>{view.label}</Badge>}
      </div>
    </header>
  )
}
