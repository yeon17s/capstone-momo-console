import { describe, expect, it } from 'vitest'
import { buildIndexLine, buildLines, groupKeyOf, numericColumns, parseRange } from './series'

describe('numericColumns', () => {
  it('시간 열·그룹 열을 제외하고 중첩 숫자는 경로로 포함', () => {
    const cols = numericColumns([{ t_s: 0, monotonic_ns: 1, servo_id: 1, position_raw: 5, targets: { I_A: 1.5 } }])
    expect(cols.sort()).toEqual(['position_raw', 'targets.I_A'])
  })
  it('문자열·비유한 값만 있는 열은 제외', () => {
    expect(numericColumns([{ a: 'x', b: NaN, c: null }])).toEqual([])
  })
})

describe('buildLines', () => {
  it('값이 없으면 0 이 아니라 null (끊김)', () => {
    const { lines } = buildLines([{ t_s: 0, x: 1 }, { t_s: 1, x: null }, { t_s: 2, x: 3 }], 'x')
    expect(lines[0].points.map((p) => p.v)).toEqual([1, null, 3])
  })
  it('t_s 없는 행은 건너뛰고 개수를 센다', () => {
    const r = buildLines([{ t_s: 0, x: 1 }, { x: 2 }], 'x')
    expect(r.skipped).toBe(1)
  })
  it('servo_id 별로 선을 나눈다', () => {
    const rows = [
      { servo_id: 1, t_s: 0, position_raw: 1 },
      { servo_id: 2, t_s: 0, position_raw: 2 },
    ]
    expect(groupKeyOf(rows)).toBe('servo_id')
    expect(buildLines(rows, 'position_raw').lines.map((l) => l.name)).toEqual(['servo_id=1', 'servo_id=2'])
  })
  it('큰 시간 공백은 선을 끊는다', () => {
    const rows = [0, 1, 2, 3, 20, 21].map((t) => ({ t_s: t, x: t }))
    const vs = buildLines(rows, 'x').lines[0].points.map((p) => p.v)
    expect(vs).toContain(null)
  })
  it('정렬되지 않은 입력도 시간순', () => {
    const { lines } = buildLines([{ t_s: 2, x: 2 }, { t_s: 0, x: 0 }], 'x')
    expect(lines[0].points.map((p) => p.t)).toEqual([0, 2])
  })
})

describe('buildIndexLine', () => {
  it('statistics 미제공 점은 null 로 두고 채우지 않는다', () => {
    const line = buildIndexLine([{ statistics: { available: false } }, { statistics: { available: true, rms: 2 } }], 'statistics.rms')
    expect(line.points.map((p) => p.v)).toEqual([null, 2])
  })
})

describe('parseRange', () => {
  it('빈 값은 제한 없음', () => {
    expect(parseRange('', ' ')).toEqual({ range: {} })
  })
  it('숫자 구간', () => {
    expect(parseRange('1.5', '10')).toEqual({ range: { from_s: 1.5, to_s: 10 } })
    expect(parseRange('', '5').range).toEqual({ to_s: 5 })
  })
  it('숫자가 아니거나 역전이면 오류', () => {
    expect(parseRange('abc', '').error).toBeTruthy()
    expect(parseRange('9', '1').error).toBeTruthy()
    expect(parseRange('Infinity', '').error).toBeTruthy()
  })
})
