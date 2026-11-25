import { useEffect, useState } from 'react'
import { useApi } from '../context/ApiContext'
import { historyRevision } from '../lib/api'
import type { MetricsQuery, MetricsResponse } from '../types/api'

interface MetricsState {
  data: MetricsResponse | null
  error: string | null
}

/**
 * `/metrics` 조회. 회차·경보·확인 라벨 등 History 지문이 바뀔 때만 다시 읽는다(센서 갱신마다 읽지 않음).
 * 조회 실패 시 마지막 성공 값은 유지하되 오류를 함께 반환한다. 오류를 0이나 정상으로 바꾸지 않는다.
 */
export function useMetrics(query: MetricsQuery = {}) {
  const { client, status } = useApi()
  const [state, setState] = useState<MetricsState>({ data: null, error: null })
  const revision = historyRevision(status)
  const queryKey = JSON.stringify(query)

  useEffect(() => {
    if (!client) return
    let cancelled = false
    client
      .metrics(JSON.parse(queryKey) as MetricsQuery)
      .then((data) => {
        if (!cancelled) setState({ data, error: null })
      })
      .catch((e: unknown) => {
        if (!cancelled) setState((s) => ({ ...s, error: e instanceof Error ? e.message : String(e) }))
      })
    return () => {
      cancelled = true
    }
  }, [client, revision, queryKey])

  return client ? state : { data: null, error: null }
}
