// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { cycle } from '../../test/fixtures'
import { fakeClient, renderWith } from '../../test/render'
import type { CyclesPage } from '../../types/api'
import { XarmHistory } from './XarmHistory'

const page = (over: Partial<CyclesPage> = {}): CyclesPage => ({
  items: [
    cycle({ id: 'a/1', alarm: null, type: 'unavailable', run_id: 'RUN-A' }),
    cycle({ id: 'a/2', alarm: true, type: 'A121', run_id: 'RUN-B', model_profile: 'old_logistic_gru' }),
    cycle({ id: 'a/3', alarm: false, run_id: 'RUN-C' }),
  ],
  total: 100,
  limit: 25,
  offset: 0,
  ...over,
})

const deferred = <T,>() => {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => (resolve = r))
  return { promise, resolve }
}

const setup = (client: Record<string, unknown>, cycles: CyclesPage | null = page(), extra = {}) =>
  renderWith(<XarmHistory />, { mode: 'xarm-history', api: { client: fakeClient(client), cycles, ...extra } })

describe('XarmHistory', () => {
  it('마운트 시 기본 쿼리(limit 25, offset 0)로 서버 조회하고 표를 보여 준다', async () => {
    const setHistoryQuery = vi.fn().mockResolvedValue(page())
    setup({ setHistoryQuery })
    expect(await screen.findByText('RUN-A · 7')).toBeTruthy()
    expect(setHistoryQuery).toHaveBeenCalledWith({ limit: 25, offset: 0 })
  })

  it('alarm=null 은 미판정 배지(미경보와 구분), 과거 프로필은 배지 표시', async () => {
    setup({ setHistoryQuery: vi.fn().mockResolvedValue(page()) })
    await screen.findByText('RUN-A · 7')
    const rows = screen.getAllByRole('row')
    expect(rows[1].textContent).toContain('미판정')
    expect(rows[1].textContent).not.toContain('미경보')
    expect(rows[2].textContent).toContain('과거 로지스틱/GRU')
    expect(document.querySelector('.badge.good')).toBeNull()
  })

  it('필터를 바꾸면 offset 0 으로 해당 필터 조회', async () => {
    const setHistoryQuery = vi.fn().mockResolvedValue(page())
    setup({ setHistoryQuery })
    await screen.findByText('RUN-A · 7')
    await userEvent.click(screen.getByRole('button', { name: '다음' }))
    await waitFor(() => expect(setHistoryQuery).toHaveBeenLastCalledWith({ limit: 25, offset: 25 }))
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /원 경보 결과/ }), 'null')
    await waitFor(() => expect(setHistoryQuery).toHaveBeenLastCalledWith({ limit: 25, offset: 0, alarm: null }))
  })

  it('"실제 정상/이상"은 confirmed + label 조합으로 조회', async () => {
    const setHistoryQuery = vi.fn().mockResolvedValue(page())
    setup({ setHistoryQuery })
    await screen.findByText('RUN-A · 7')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /실제 확인 여부/ }), 'true')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /실제 라벨/ }), 'normal')
    await waitFor(() =>
      expect(setHistoryQuery).toHaveBeenLastCalledWith({ limit: 25, offset: 0, confirmed: true, label: 'normal' }),
    )
  })

  it('새 필터 응답이 오기 전에는 이전 필터의 결과를 보여 주지 않는다', async () => {
    const second = deferred<CyclesPage>()
    const setHistoryQuery = vi.fn().mockResolvedValueOnce(page()).mockReturnValue(second.promise)
    setup({ setHistoryQuery })
    await screen.findByText('RUN-A · 7')
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /원 경보 결과/ }), 'true')
    await waitFor(() => expect(screen.queryByText('RUN-A · 7')).toBeNull())
    expect(screen.getByText('불러오는 중입니다.')).toBeTruthy()
    second.resolve(page())
    expect(await screen.findByText('RUN-A · 7')).toBeTruthy()
  })

  it('서버가 조회 조건을 거절하면 빈 결과가 아니라 오류로 표시', async () => {
    const setHistoryQuery = vi.fn().mockRejectedValue(new Error('조회 조건이 올바르지 않습니다 (HTTP 422)'))
    setup({ setHistoryQuery })
    expect((await screen.findByRole('alert')).textContent).toContain('HTTP 422')
    expect(screen.queryByText(/조건에 맞는 결과가 없습니다/)).toBeNull()
  })

  it('현재 페이지 내 검색은 범위를 명시한다', async () => {
    setup({ setHistoryQuery: vi.fn().mockResolvedValue(page()) })
    await screen.findByText('RUN-A · 7')
    await userEvent.type(screen.getByPlaceholderText('서버 검색 아님'), 'RUN-B')
    expect(screen.getByText(/현재 페이지 3행 안에서만 검색한 결과 1행/)).toBeTruthy()
    expect(screen.getByText(/전체 결과가\s*아닙니다/)).toBeTruthy()
  })

  it('건수 문구가 운행 횟수가 아님을 밝힌다', async () => {
    setup({ setHistoryQuery: vi.fn().mockResolvedValue(page()) })
    await screen.findByText('RUN-A · 7')
    expect(screen.getByText(/운행 횟수가 아닙니다/)).toBeTruthy()
  })

  it('CSV: 서버 상한으로 잘리면 전체가 아님을 경고하고 링크도 일부임을 표시', async () => {
    const csvInfo = vi.fn().mockResolvedValue({ url: '/api/v1/cycles.csv', total: 120000, rows: 100000, truncated: true })
    setup({ setHistoryQuery: vi.fn().mockResolvedValue(page()), csvInfo })
    await screen.findByText('RUN-A · 7')
    await userEvent.click(screen.getByRole('button', { name: 'CSV 준비' }))
    expect(await screen.findByText(/전체 이력이 아닙니다/)).toBeTruthy()
    expect(screen.getByRole('link', { name: /일부만 포함/ })).toBeTruthy()
    expect(csvInfo).toHaveBeenCalledWith({ limit: 25, offset: 0 })
  })

  it('CSV: 잘리지 않으면 일반 안내, 필터가 바뀌면 준비 상태 초기화', async () => {
    const csvInfo = vi.fn().mockResolvedValue({ url: '/x.csv', total: 60, rows: 60, truncated: false })
    setup({ setHistoryQuery: vi.fn().mockResolvedValue(page()), csvInfo })
    await screen.findByText('RUN-A · 7')
    await userEvent.click(screen.getByRole('button', { name: 'CSV 준비' }))
    expect(await screen.findByRole('link', { name: 'CSV 내려받기' })).toBeTruthy()
    await userEvent.selectOptions(screen.getByRole('combobox', { name: /원 경보 결과/ }), 'true')
    await waitFor(() => expect(screen.queryByRole('link', { name: 'CSV 내려받기' })).toBeNull())
  })

  it('CSV 헤더를 읽지 못하면 오류로 표시 (전체로 가정하지 않음)', async () => {
    const csvInfo = vi.fn().mockRejectedValue(new Error('CSV 행 수·상한 헤더를 읽을 수 없습니다.'))
    setup({ setHistoryQuery: vi.fn().mockResolvedValue(page()), csvInfo })
    await screen.findByText('RUN-A · 7')
    await userEvent.click(screen.getByRole('button', { name: 'CSV 준비' }))
    expect((await screen.findByRole('alert')).textContent).toContain('읽을 수 없습니다')
    expect(screen.queryByRole('link', { name: /CSV/ })).toBeNull()
  })

  it('연결이 끊기면 마지막으로 읽은 목록임을 안내', async () => {
    setup({ setHistoryQuery: vi.fn().mockResolvedValue(page()) }, page(), { connection: 'offline' })
    expect(await screen.findByText(/마지막으로 읽은 값/)).toBeTruthy()
  })

  it('비교는 최대 2개: 3번째 선택은 안내만 하고 추가하지 않는다', async () => {
    const detailClient = {
      setHistoryQuery: vi.fn().mockResolvedValue(page()),
      cycle: vi.fn().mockImplementation(async (id: string) => cycle({ id })),
      series: vi.fn().mockResolvedValue({ cycle_id: 'x', series: {}, limit: 2000, truncated: false }),
      trends: vi.fn().mockResolvedValue({ points: [], total: 0, limit: 2000, truncated: false }),
    }
    setup(detailClient)
    await screen.findByText('RUN-A · 7')
    const open = screen.getAllByRole('button', { name: '열기' })
    await userEvent.click(open[0])
    await userEvent.click(screen.getAllByRole('button', { name: '열기' })[0])
    await userEvent.click(screen.getAllByRole('button', { name: '열기' })[0])
    expect(screen.getByText(/최대 2개까지 비교할 수 있습니다/)).toBeTruthy()
    expect(detailClient.cycle).toHaveBeenCalledTimes(2)
  })
})
