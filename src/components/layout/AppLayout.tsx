import { lazy, Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useSource } from '../../context/SourceContext'
import { Footer } from './Footer'
import { Header } from './Header'
import { SourceSwitch } from './SourceSwitch'

// 공개 평가 데이터(payload.json)에 의존하는 UI는 필요할 때만 불러온다.
const ModelToolbar = lazy(() => import('./ModelToolbar').then((m) => ({ default: m.ModelToolbar })))
const ComparePanel = lazy(() => import('./ComparePanel').then((m) => ({ default: m.ComparePanel })))

export function AppLayout() {
  const { pathname } = useLocation()
  const { mode } = useSource()
  const isPublic = mode === 'public'

  useEffect(() => {
    document.title = `MOmO · ${pathname.slice(1) || 'dashboard'} · Revision 04`
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
        {isPublic && (
          <Suspense fallback={null}>
            <ModelToolbar />
          </Suspense>
        )}
        <Outlet />
        {isPublic && (
          <Suspense fallback={null}>
            <ComparePanel />
          </Suspense>
        )}
        <Footer />
      </main>
    </>
  )
}
