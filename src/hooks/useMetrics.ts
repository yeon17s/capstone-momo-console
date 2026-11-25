import { useEffect, useState } from 'react'
import { useApi } from '../context/ApiContext'
import { historyRevision } from '../lib/api'
import type { MetricsQuery, MetricsResponse } from '../types/api'

interface MetricsState {
  /** 이 결과가 어떤 범위(queryKey)의 것인지. 범위가 바뀌면 이전 범위의 숫자를 보여 주지 않는다. */
  key: string
  data: MetricsResponse | null
  error: string | null
}

/**
 * `/metrics` 조회. 회차·경보·확인 라벨 등 History 지문이 바뀌거나 SSE reset/gap/재연결로 전체 재조회가 일어날 때만 다시 읽는다(센서 갱신마다 읽지 않음).
 * 조회 실패 시 마지막 성공 값은 유지하되 오류를 함께 반환한다. 오류를 0이나 정상으로 바꾸지 않는다.
 */
export function useMetrics(query: MetricsQuery = {}, enabled = true) {
  const { client, status, refreshCount } = useApi()
  const [state, setState] = useState<MetricsState>({ key: '', data: null, error: null })
  const revision = historyRevision(status)
  const queryKey = JSON.stringify(query)

  useEffect(() => {
    if (!client || !enabled) return
    let cancelled = false
    client
      .metrics(JSON.parse(queryKey) as MetricsQuery)
      .then((data) => {
        if (!cancelled) setState({ key: queryKey, data, error: null })
      })
      .catch((e: unknown) => {
        if (cancelled) return
        const error = e instanceof Error ? e.message : String(e)
        setState((s) => ({ key: queryKey, data: s.key === queryKey ? s.data : null, error }))
      })
    return () => {
      cancelled = true
    }
  }, [client, enabled, revision, refreshCount, queryKey])

  if (!client || !enabled) return { data: null, error: null }
  // 다른 범위의 이전 결과는 숨긴다(로딩으로 취급).
  return state.key === queryKey ? { data: state.data, error: state.error } : { data: null, error: null }
}
