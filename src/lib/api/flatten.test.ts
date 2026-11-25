import { describe, expect, it } from 'vitest'
import { flattenJson } from './flatten'

describe('flattenJson', () => {
  it('중첩 객체·배열을 경로로 펼친다', () => {
    const rows = flattenJson({ a: { b: 1 }, c: [true, 'x'] })
    expect(rows.map((r) => [r.path, r.value])).toEqual([
      ['a.b', '1'],
      ['c[0]', 'true'],
      ['c[1]', 'x'],
    ])
  })
  it('임계값 숫자를 반올림하지 않는다', () => {
    expect(flattenJson({ t: 7.288925055167675 })[0].value).toBe('7.288925055167675')
  })
  it('null/빈 값은 0·false 가 아니라 미제공으로 표시', () => {
    const rows = flattenJson({ n: null, e: [], o: {} })
    expect(rows.every((r) => r.kind === 'null')).toBe(true)
    expect(rows[0].value).toContain('미제공')
  })
  it('HTML 문자열도 문자열 그대로 보존', () => {
    expect(flattenJson({ s: '<b>x</b>' })[0].value).toBe('<b>x</b>')
  })
  it('행 수 상한', () => {
    const big = Object.fromEntries(Array.from({ length: 5000 }, (_, i) => [`k${i}`, i]))
    expect(flattenJson(big).length).toBe(1000)
  })
})
