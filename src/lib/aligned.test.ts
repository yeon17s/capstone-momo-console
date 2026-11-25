import { describe, expect, it } from 'vitest'
import data from '../data/aligned.json'
import { alignedKey, availableActions, availableSettings, availableSignals, seriesFor, type AlignedData } from './aligned'

const d = data as unknown as AlignedData

describe('aligned.json (aligned_timeseries.csv 압축본)', () => {
  it('원본 CSV와 같은 규모: 1792 계열 × 60점, 32 setting', () => {
    expect(Object.keys(d.series)).toHaveLength(1792)
    expect(d.progress).toHaveLength(60)
    expect(availableSettings(d)).toHaveLength(32)
  })
  it('모든 계열의 길이가 격자와 같고 q10 ≤ 중앙값 ≤ q90, 값은 유한', () => {
    for (const [key, s] of Object.entries(d.series)) {
      expect(s.m).toHaveLength(60)
      expect(s.lo).toHaveLength(60)
      expect(s.hi).toHaveLength(60)
      for (let i = 0; i < 60; i++) {
        expect(Number.isFinite(s.m[i]) && Number.isFinite(s.lo[i]) && Number.isFinite(s.hi[i]), key).toBe(true)
        expect(s.lo[i] <= s.m[i] && s.m[i] <= s.hi[i], `${key}[${i}]`).toBe(true)
      }
      expect(s.n).toBeGreaterThan(0)
    }
  })
  it('진행률은 0에서 100 미만까지 오름차순 (실제 시각 아님)', () => {
    expect(d.progress[0]).toBe(0)
    expect(d.progress.every((v, i) => i === 0 || v > d.progress[i - 1])).toBe(true)
    expect(d.progress[59]).toBeLessThanOrEqual(100)
  })
  it('원본 CSV 첫 행과 일치 (setting 0, Action 1, robot_current, PRE_A 의 0%)', () => {
    const s = d.series[alignedKey(0, 1, 'robot_current', 'PRE_A')]
    expect(s.n).toBe(948)
    expect(s.m[0]).toBeCloseTo(1.069, 3)
    expect(s.lo[0]).toBeCloseTo(0.7764, 3)
    expect(s.hi[0]).toBeCloseTo(1.362, 3)
  })
  it('seriesFor 는 같은 setting·action·signal 의 그룹만 모은다', () => {
    const g = seriesFor(d, 0, 1, 'robot_current')
    expect(g.map((x) => x.group).sort()).toEqual(['Anomaly', 'PRE_A'])
    expect(seriesFor(d, 0, 1, '없는-신호')).toEqual([])
  })
  it('선택지는 setting 에 따라 달라진다 (없는 조합을 제시하지 않음)', () => {
    for (const setting of availableSettings(d)) {
      for (const action of availableActions(d, setting)) {
        for (const signal of availableSignals(d, setting, action)) {
          expect(seriesFor(d, setting, action, signal).length).toBeGreaterThan(0)
        }
      }
    }
  })
})
