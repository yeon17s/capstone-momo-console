import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ComparePanel } from './ComparePanel'
import { Footer } from './Footer'
import { Header } from './Header'
import { ModelToolbar } from './ModelToolbar'
import { SourceSwitch } from './SourceSwitch'

export function AppLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = `MOmO · ${pathname.slice(1) || 'dashboard'} · Revision 03`
  }, [pathname])

  return (
    <>
      <Header />
      <main>
        <div className="statusline">
          <span className="pill">YU-COBOT / VORAUS-AD</span>
        </div>
        <div className="title">
          <div>
            <h1>공개 데이터 실험 · 분석 콘솔</h1>
            <div className="muted">탐색적 사후 평가 · 최종 독립 검증 아님</div>
          </div>
        </div>
        <SourceSwitch />
        <ModelToolbar />
        <Outlet />
        <ComparePanel />
        <Footer />
      </main>
    </>
  )
}
