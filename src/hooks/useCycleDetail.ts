import { useEffect, useState } from 'react'
import { useApi } from '../context/ApiContext'
import type { Cycle, SeriesChannel, SeriesResponse, TrendsResponse } from '../types/api'

const CHANNELS: SeriesChannel[] = ['ina', 'adxl', 'positions', 'forecasts', 'residuals', 'alarms', 'publication']

/** 파형 구간 (No.3 시작 기준 초). 비어 있으면 전체. */
export interface SeriesRange {
  from_s?: number
  to_s?: number
}

interface MetaState {
  id: string
  cycle: Cycle | null
  trends: TrendsResponse | null
  error: string | null
}

interface SeriesState {
  key: string
  series: SeriesResponse | null
  error: string | null
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

/**
 * 회차 상세 + 추세 + 파형. 열 때 한 번 읽는 저장 스냅샷이며 자동 갱신하지 않는다(`reload`로만 다시 읽음).
 * 파형은 구간(range)이 바뀔 때만 다시 읽고 상세·추세는 다시 읽지 않는다.
 * id 는 목록의 opaque id 를 그대로 쓰고 URL 인코딩은 Client 가 한다.
 */
export type CycleDetail = ReturnType<typeof useCycleDetail>

export function useCycleDetail(id: string, range: SeriesRange = {}) {
  const { client } = useApi()
  const [meta, setMeta] = useState<MetaState | null>(null)
  const [seriesState, setSeriesState] = useState<SeriesState | null>(null)
  const [nonce, setNonce] = useState(0)
  const rangeKey = JSON.stringify([range.from_s ?? null, range.to_s ?? null])
  const seriesKey = `${id}|${rangeKey}`

  useEffect(() => {
    if (!client) return
    let cancelled = false
    ;(async () => {
      try {
        const cycle = (await client.cycle(id)) as Cycle
        const trends = cycle.run_id ? await client.trends({ run_id: cycle.run_id, limit: 2000 }) : null
        if (!cancelled) setMeta({ id, cycle, trends, error: null })
      } catch (e) {
        if (!cancelled) setMeta({ id, cycle: null, trends: null, error: message(e) })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [client, id, nonce])

  useEffect(() => {
    if (!client) return
    let cancelled = false
    const [from_s, to_s] = JSON.parse(rangeKey) as [number | null, number | null]
    client
      .series(id, {
        channels: CHANNELS,
        limit: 2000,
        ...(from_s !== null ? { from_s } : {}),
        ...(to_s !== null ? { to_s } : {}),
      })
      .then((series) => {
        if (!cancelled) setSeriesState({ key: seriesKey, series, error: null })
      })
      .catch((e: unknown) => {
        if (!cancelled) setSeriesState({ key: seriesKey, series: null, error: message(e) })
      })
    return () => {
      cancelled = true
    }
  }, [client, id, rangeKey, seriesKey, nonce])

  const m = meta?.id === id ? meta : null
  const s = seriesState?.key === seriesKey ? seriesState : null
  return {
    cycle: m?.cycle ?? null,
    trends: m?.trends ?? null,
    series: s?.series ?? null,
    error: m?.error ?? null,
    seriesError: s?.error ?? null,
    loading: !m,
    seriesLoading: !s,
    reload: () => setNonce((n) => n + 1),
  }
}
