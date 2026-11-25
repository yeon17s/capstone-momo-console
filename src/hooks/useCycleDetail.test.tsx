// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { act } from 'react'
import { cycle } from '../test/fixtures'
import { apiValue, fakeClient } from '../test/render'
import { ApiContext } from '../context/ApiContext'
import { useCycleDetail, type SeriesRange } from './useCycleDetail'
import type { ReactNode } from 'react'

const seriesOf = (id: string) => ({ cycle_id: id, series: {}, limit: 2000, truncated: false })

function setup() {
  const client = {
    cycle: vi.fn().mockImplementation(async (id: string) => cycle({ id, run_id: 'RUN-1' })),
    trends: vi.fn().mockResolvedValue({ points: [], total: 0, limit: 2000, truncated: false }),
    series: vi.fn().mockImplementation(async (id: string) => seriesOf(id)),
  }
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ApiContext value={apiValue({ client: fakeClient(client) })}>{children}</ApiContext>
  )
  return { client, wrapper }
}

describe('useCycleDetail', () => {
  it('상세·추세·파형을 한 번씩 읽는다 (opaque id 그대로 전달)', async () => {
    const { client, wrapper } = setup()
    const { result } = renderHook(() => useCycleDetail('a:b/c'), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await waitFor(() => expect(result.current.seriesLoading).toBe(false))
    expect(client.cycle).toHaveBeenCalledWith('a:b/c')
    expect(client.series).toHaveBeenCalledTimes(1)
    expect(client.trends).toHaveBeenCalledWith({ run_id: 'RUN-1', limit: 2000 })
  })

  it('파형 구간만 바꾸면 파형만 다시 읽고 상세·추세는 다시 읽지 않는다', async () => {
    const { client, wrapper } = setup()
    const { result, rerender } = renderHook(({ r }: { r: SeriesRange }) => useCycleDetail('x', r), {
      wrapper,
      initialProps: { r: {} as SeriesRange },
    })
    await waitFor(() => expect(result.current.seriesLoading).toBe(false))
    rerender({ r: { from_s: 2, to_s: 5 } })
    await waitFor(() => expect(client.series).toHaveBeenCalledTimes(2))
    expect(client.series.mock.calls[1][1]).toMatchObject({ from_s: 2, to_s: 5 })
    expect(client.cycle).toHaveBeenCalledTimes(1)
    expect(client.trends).toHaveBeenCalledTimes(1)
  })

  it('구간이 바뀌어 응답이 오기 전에는 이전 구간의 파형을 보여 주지 않는다', async () => {
    const { client, wrapper } = setup()
    let release!: () => void
    client.series.mockImplementationOnce(async (id: string) => seriesOf(id)).mockImplementationOnce(
      (id: string) => new Promise((res) => (release = () => res(seriesOf(id)))),
    )
    const { result, rerender } = renderHook(({ r }: { r: SeriesRange }) => useCycleDetail('x', r), {
      wrapper,
      initialProps: { r: {} as SeriesRange },
    })
    await waitFor(() => expect(result.current.series).not.toBeNull())
    rerender({ r: { from_s: 1 } })
    await waitFor(() => expect(result.current.series).toBeNull())
    expect(result.current.seriesLoading).toBe(true)
    await act(async () => release())
    await waitFor(() => expect(result.current.series).not.toBeNull())
  })

  it('이미 취소된(다른 id 로 바뀐) 요청의 응답이 상태를 덮어쓰지 않는다', async () => {
    const { client, wrapper } = setup()
    const late: Record<string, () => void> = {}
    client.cycle.mockImplementation(
      (id: string) => new Promise((res) => (late[id] = () => res(cycle({ id, run_id: 'R' })))),
    )
    const { result, rerender } = renderHook(({ id }) => useCycleDetail(id), { wrapper, initialProps: { id: 'one' } })
    rerender({ id: 'two' })
    await act(async () => late['two']())
    await waitFor(() => expect(result.current.cycle?.id).toBe('two'))
    await act(async () => late['one']()) // 늦게 도착한 이전 응답
    expect(result.current.cycle?.id).toBe('two')
  })

  it('조회 실패는 error 로 노출된다', async () => {
    const { client, wrapper } = setup()
    client.cycle.mockRejectedValue(new Error('요청한 항목을 찾을 수 없습니다 (HTTP 404)'))
    const { result } = renderHook(() => useCycleDetail('nope'), { wrapper })
    await waitFor(() => expect(result.current.error).toContain('HTTP 404'))
    expect(result.current.cycle).toBeNull()
  })
})
