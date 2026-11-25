import { lazy, Suspense } from 'react'
import { AsyncState } from '../components/common'
import { XarmHistory } from '../components/history/XarmHistory'
import { useSource } from '../context/SourceContext'

// 공개 평가 화면은 payload.json(약 3.5MB)에 의존하므로 별도 청크로 분리한다.
const Public = lazy(() => import('./public/PublicHistory'))

export default function HistoryPage() {
  const { mode } = useSource()
  if (mode !== 'public') return <XarmHistory />
  return (
    <Suspense fallback={<AsyncState kind="loading" />}>
      <Public />
    </Suspense>
  )
}
