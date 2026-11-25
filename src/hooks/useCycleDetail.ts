import { useEffect, useState } from 'react'
import { useApi } from '../context/ApiContext'
import type { Cycle, SeriesChannel, SeriesResponse, TrendsResponse } from '../types/api'

const CHANNELS: SeriesChannel[] = ['ina', 'adxl', 'positions', 'forecasts', 'residuals', 'alarms', 'publication']

interface DetailState {
  id: string
  cycle: Cycle | null
  series: SeriesResponse | null
  trends: TrendsResponse | null
  error: string | null
}

/**
 * 회차 상세 + 파형 + 추세. 열 때 한 번 읽는 저장 스냅샷이며 자동 갱신하지 않는다(`reload`로만 다시 읽음).
 * id 는 목록의 opaque id 를 그대로 쓰고 URL 인코딩은 Client 가 한다.
 */
export type CycleDetail = ReturnType<typeof useCycleDetail>

export function useCycleDetail(id: string) {
  const { client } = useApi()
  const [state, setState] = useState<DetailState | null>(null)
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    if (!client) return
    let cancelled = false
    ;(async () => {
      try {
        const cycle = (await client.cycle(id)) as Cycle
        const [series, trends] = await Promise.all([
          client.series(id, { channels: CHANNELS, limit: 2000 }),
          cycle.run_id ? client.trends({ run_id: cycle.run_id, limit: 2000 }) : Promise.resolve(null),
        ])
        if (!cancelled) setState({ id, cycle, series, trends, error: null })
      } catch (e) {
        if (!cancelled) setState({ id, cycle: null, series: null, trends: null, error: e instanceof Error ? e.message : String(e) })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [client, id, nonce])

  const current = state?.id === id ? state : null
  return { ...(current ?? { cycle: null, series: null, trends: null, error: null }), loading: !current, reload: () => setNonce((n) => n + 1) }
}
