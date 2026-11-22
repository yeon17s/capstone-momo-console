import { NavLink } from 'react-router-dom'
import { Badge } from '../common'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/history', label: 'History' },
  { to: '/settings', label: 'Settings' },
]

export function Header() {
  return (
    <header>
      <div className="brand">
        MOmO <em>/</em> ROBOT ANALYTICS
        <small>공개 데이터 분석 콘솔</small>
      </div>
      <nav aria-label="주요 화면">
        {NAV_ITEMS.map(({ to, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
            {label}
          </NavLink>
        ))}
      </nav>
      <Badge tone="blue">공개 평가 스냅샷</Badge>
    </header>
  )
}
