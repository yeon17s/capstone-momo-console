import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useSource } from '../../context/SourceContext'
import { ComparePanel } from './ComparePanel'
import { Footer } from './Footer'
import { Header } from './Header'
import { ModelToolbar } from './ModelToolbar'
import { SourceSwitch } from './SourceSwitch'

export function AppLayout() {
  const { pathname } = useLocation()
  const { mode } = useSource()
  const isPublic = mode === 'public'

  useEffect(() => {
    document.title = `MOmO · ${pathname.slice(1) || 'dashboard'} · Revision 03`
  }, [pathname])

  return (
    <>
      <Header />
      <main>
        <div className="statusline">
          <span className="pill">{isPublic ? 'YU-COBOT / VORAUS-AD' : 'XARM · /API/V1 읽기 전용'}</span>
        </div>
        <div className="title">
          <div>
            <h1>{isPublic ? '공개 데이터 실험 · 분석 콘솔' : 'xArm 읽기 전용 콘솔'}</h1>
            <div className="muted">
              {isPublic
                ? '탐색적 사후 평가 · 최종 독립 검증 아님'
                : '서버가 저장·관찰한 기록 표시 · 로봇 제어·모델 변경 기능 없음'}
            </div>
          </div>
        </div>
        <SourceSwitch />
        {isPublic && <ModelToolbar />}
        <Outlet />
        {isPublic && <ComparePanel />}
        <Footer />
      </main>
    </>
  )
}
