// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWith } from '../../test/render'
import { SourceSwitch } from './SourceSwitch'

describe('SourceSwitch', () => {
  it('현재 모드만 aria-pressed=true', () => {
    renderWith(<SourceSwitch />, { mode: 'xarm-history' })
    const [pub, hist, live] = screen.getAllByRole('button')
    expect(pub.getAttribute('aria-pressed')).toBe('false')
    expect(hist.getAttribute('aria-pressed')).toBe('true')
    expect(live.getAttribute('aria-pressed')).toBe('false')
  })

  it('키보드(Tab + Enter)로 모드를 바꿀 수 있다', async () => {
    const setMode = vi.fn()
    renderWith(<SourceSwitch />, { mode: 'public', setMode })
    await userEvent.tab()
    await userEvent.tab()
    expect(document.activeElement?.textContent).toContain('xArm 저장 이력')
    await userEvent.keyboard('{Enter}')
    expect(setMode).toHaveBeenCalledWith('xarm-history')
  })

  it('xArm 선택 시 실제 연결 상태를 배지로 표시, 미선택은 "선택하면 연결"', () => {
    renderWith(<SourceSwitch />, { mode: 'xarm-live', api: { connection: 'reconnecting' } })
    expect(screen.getByText('재연결 중')).toBeTruthy()
    expect(screen.getByText('선택하면 연결')).toBeTruthy()
    expect(screen.queryByText('API 미연결')).toBeNull()
  })

  it('live 모드 설명에 장비 안전을 보증하지 않는다고 적혀 있다', () => {
    renderWith(<SourceSwitch />, { mode: 'public' })
    expect(screen.getByText(/장비 안전·운전·운반 성공을 보증하지 않습니다/)).toBeTruthy()
  })

  it('모든 연결 상태에 대응하는 라벨이 있다', async () => {
    const states = ['connecting', 'connected', 'reconnecting', 'polling', 'offline'] as const
    const labels = ['연결 중', 'SSE 연결됨', '재연결 중', 'polling', '오프라인']
    for (const [i, connection] of states.entries()) {
      const { unmount } = renderWith(<SourceSwitch />, { mode: 'xarm-live', api: { connection } })
      expect(screen.getByText(labels[i])).toBeTruthy()
      unmount()
    }
  })
})
