// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '../../test/render' // afterEach(cleanup)
import { AlignedTimeseriesCard } from './AlignedTimeseriesCard'

describe('AlignedTimeseriesCard', () => {
  it('처음에는 데이터를 불러오지 않고, 실제 시각이 아님을 안내한다', () => {
    render(<AlignedTimeseriesCard />)
    expect(screen.getByRole('button', { name: /불러오기/ })).toBeTruthy()
    expect(screen.getByText(/실제 시각\(초\)이 아닙니다/)).toBeTruthy()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('불러오면 선택지와 차트가 나오고, 선택은 존재하는 조합으로만 제한된다', async () => {
    render(<AlignedTimeseriesCard />)
    await userEvent.click(screen.getByRole('button', { name: /불러오기/ }))
    expect(await screen.findByRole('img', { name: /정렬 시계열/ })).toBeTruthy()
    const setting = screen.getByRole('combobox', { name: /setting/ })
    expect((setting as HTMLSelectElement).options).toHaveLength(32)
    await userEvent.selectOptions(setting, '5')
    expect((screen.getByRole('combobox', { name: /Action/ }) as HTMLSelectElement).options.length).toBeGreaterThan(0)
    expect(screen.getByText(/같은 setting·Action끼리만 비교/)).toBeTruthy()
  })
})
