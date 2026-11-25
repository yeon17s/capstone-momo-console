// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { cycle, status } from '../../test/fixtures'
import { renderWith } from '../../test/render'
import { XarmStatusCards } from './XarmStatusCards'

const show = (st: ReturnType<typeof status> | null, extra: Parameters<typeof renderWith>[1] = {}) =>
  renderWith(
    <MemoryRouter>
      <XarmStatusCards />
    </MemoryRouter>,
    { ...extra, api: { status: st, ...(extra.api ?? {}) } },
  )

const hasGoodBadge = (c: HTMLElement) => c.querySelector('.badge.good') !== null

describe('XarmStatusCards 불변식', () => {
  it('원경보 true + normal_like: 경보가 유지되고 보조 추정은 별도 표시', () => {
    const c = cycle({
      alarm: true,
      type: 'unknown',
      auxiliary: { estimated_type: 'normal_like', estimate_status: 'estimated', tentative: true },
    })
    const { getAllByText, getByText, container } = show(status(c))
    expect(getAllByText('이상 경보').length).toBeGreaterThan(0)
    expect(getByText('유형 미상')).toBeTruthy() // 원 유형
    expect(getByText('정상 유사 · 원경보 유지')).toBeTruthy() // 보조 추정은 따로
    expect(getByText(/경보는 유지됩니다/)).toBeTruthy()
    expect(hasGoodBadge(container)).toBe(false)
  })

  it('alarm=null 은 미판정이며 미경보로 표시되지 않는다', () => {
    const { getAllByText, queryByText, container } = show(status(cycle({ alarm: null, type: 'unavailable' })))
    expect(getAllByText('미판정').length).toBeGreaterThan(0)
    expect(queryByText('미경보')).toBeNull()
    expect(hasGoodBadge(container)).toBe(false)
  })

  it('alarm=false 는 미경보이지만 초록(정상) 배지로 표시하지 않는다', () => {
    const { getAllByText, container } = show(status(cycle({ alarm: false })))
    expect(getAllByText('미경보').length).toBeGreaterThan(0)
    expect(hasGoodBadge(container)).toBe(false)
  })

  it('no_data: latest=null 이면 데이터 없음 안내, 센서 숫자를 만들지 않는다', () => {
    const { getByText, queryByText } = show(status(null, 'no_data'))
    expect(getByText(/기록된 데이터가 없습니다/)).toBeTruthy()
    expect(queryByText('이상 경보')).toBeNull()
    expect(queryByText(/INA 전체 공급 전류/)).toBeNull()
  })

  it('stale: 갱신되지 않는 값임을 표시', () => {
    const c = cycle({ freshness: { status: 'stale', age_s: 42, reason: 'no update' } })
    expect(show(status(c)).getByText(/갱신되지 않고/)).toBeTruthy()
  })

  it('SSE 연결이 끊기면 마지막 관측값임을 표시', () => {
    const { getByText } = show(status(cycle()), { api: { connection: 'reconnecting' } })
    expect(getByText(/마지막으로 관측한 값/)).toBeTruthy()
  })

  it('서버 오류는 오류로 표시되고 값을 지우지 않거나 정상으로 바꾸지 않는다', () => {
    const { getByRole } = show(null, { api: { error: '서버 오류가 발생했습니다 (HTTP 500)' } })
    expect(getByRole('alert').textContent).toContain('HTTP 500')
  })

  it('센서 valid=false 는 배지로 구분', () => {
    const c = cycle()
    c.sensors!.ina!.valid = false
    expect(show(status(c)).getAllByText('valid=false').length).toBeGreaterThan(0)
  })

  it('센서 값이 없으면 0 이 아니라 대시', () => {
    const c = cycle()
    c.sensors!.ina!.current_A = null
    const { getByText } = show(status(c))
    expect(getByText('— A')).toBeTruthy()
  })

  it('과거 로지스틱 프로필은 현재 CatBoost 결과가 아님을 표시', () => {
    const c = cycle({ model_profile: 'old_logistic_gru' })
    c.detectors = { logistic: { score: 0.3, threshold: 0.5, alarm: false }, gru: { score: 1, threshold: 7, alarm: false }, combined: { alarm: false, type: 'no_alarm' } }
    expect(show(status(c)).getByText(/현재\s*CatBoost 결과가 아닙니다/)).toBeTruthy()
  })

  it('계획 조건은 정답이 아님을 표시하고 실제 라벨과 분리', () => {
    const c = cycle({ condition: 'load_plus', operator: { confirmed: false, label: null, outcome: null } })
    const { getByText } = show(status(c))
    expect(getByText('계획 조건 (condition, 정답 아님)')).toBeTruthy()
    expect(getByText('미확정')).toBeTruthy()
  })

  it('live / history 모드 제목과 안내가 구분된다', () => {
    expect(show(status(cycle()), { mode: 'xarm-live' }).getByText('xArm 현재 상태')).toBeTruthy()
    const h = show(status(cycle(), 'history'), { mode: 'xarm-history' })
    expect(h.getByText('xArm 최근 저장 기록')).toBeTruthy()
    expect(h.getByText(/현재 운전 중이라는 뜻은 아닙니다/)).toBeTruthy()
  })
})
