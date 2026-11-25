// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { fakeClient, renderWith } from '../../test/render'
import { metrics } from '../../test/fixtures'
import type { MetricsResponse } from '../../types/api'
import { XarmMetricsPanel } from './XarmMetricsPanel'

const deferred = <T,>() => {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

describe('XarmMetricsPanel', () => {
  it('분모 7종을 표시하고, 비율이 null 이면 0%가 아니라 미제공', async () => {
    const client = fakeClient({ metrics: vi.fn().mockResolvedValue(metrics()) })
    renderWith(<XarmMetricsPanel />, { api: { client } })
    expect(await screen.findByText('확인된 실제 라벨')).toBeTruthy()
    for (const label of ['평가 분모', '판정 불가', '정상 평가', '이상 평가', '미확정/미분류 정답', '동작 0 제외']) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    expect(screen.getByText('null (미제공)')).toBeTruthy()
    expect(screen.queryByText('0%')).toBeNull()
  })

  it('필터 없음이면 서버 전체 범위로 표시하고 조건부 안내는 없다', async () => {
    const m = vi.fn().mockResolvedValue(metrics())
    renderWith(<XarmMetricsPanel />, { api: { client: fakeClient({ metrics: m }) } })
    await screen.findByText('확인된 실제 라벨')
    expect(screen.getByText(/서버 전체 기록/)).toBeTruthy()
    expect(screen.queryByText(/조건부 집계/)).toBeNull()
    expect(m).toHaveBeenCalledWith({})
  })

  it('경보 결과로 거르면 조건부 집계임을 표시하고 해당 쿼리로 조회', async () => {
    const m = vi.fn().mockResolvedValue(metrics())
    renderWith(<XarmMetricsPanel />, { api: { client: fakeClient({ metrics: m }) } })
    await screen.findByText('확인된 실제 라벨')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /경보 결과로 거르기/ }), 'true')
    expect(await screen.findByText(/조건부 집계입니다/)).toBeTruthy()
    await waitFor(() => expect(m).toHaveBeenLastCalledWith({ alarm: true }))
  })

  it('범위를 바꾸면 이전 범위의 숫자를 새 범위처럼 보여 주지 않는다', async () => {
    const second = deferred<MetricsResponse>()
    const m = vi.fn().mockResolvedValueOnce(metrics()).mockReturnValue(second.promise)
    renderWith(<XarmMetricsPanel />, { api: { client: fakeClient({ metrics: m }) } })
    await screen.findByText('확인된 실제 라벨')
    await userEvent.type(screen.getByRole('combobox', { name: /세션/ }), 'RUN-X')
    await waitFor(() => expect(screen.queryByText('확인된 실제 라벨')).toBeNull())
    expect(screen.getByText('불러오는 중입니다.')).toBeTruthy()
    second.resolve(metrics({ confirmed_total: 77 }))
    expect(await screen.findByText('77')).toBeTruthy()
  })

  it('조회 실패는 오류로 표시한다 (0·정상으로 대체하지 않음)', async () => {
    const m = vi.fn().mockRejectedValue(new Error('서버 오류가 발생했습니다 (HTTP 500)'))
    renderWith(<XarmMetricsPanel />, { api: { client: fakeClient({ metrics: m }) } })
    expect((await screen.findByRole('alert')).textContent).toContain('HTTP 500')
    expect(screen.queryByText('확인된 실제 라벨')).toBeNull()
  })
})
