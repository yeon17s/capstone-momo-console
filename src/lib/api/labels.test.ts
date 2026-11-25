import { describe, expect, it } from 'vitest'
import { alarmLabel, cursorTransition, numberLabel, typeLabel } from './labels'

describe('alarmLabel', () => {
  it('true / false / null 을 구분한다', () => {
    expect(alarmLabel(true)).toBe('이상 경보')
    expect(alarmLabel(false)).toBe('미경보')
    expect(alarmLabel(null)).toBe('미판정')
  })
  it('null 을 미경보로 바꾸지 않는다', () => {
    expect(alarmLabel(null)).not.toBe(alarmLabel(false))
  })
  it('boolean/null 이 아닌 값은 거부한다', () => {
    expect(() => alarmLabel('false' as never)).toThrow(TypeError)
    expect(() => alarmLabel(0 as never)).toThrow(TypeError)
  })
})

describe('typeLabel / numberLabel', () => {
  it('원 유형과 보조 유형 라벨', () => {
    expect(typeLabel('normal_like')).toContain('원경보 유지')
    expect(typeLabel(null)).toBe('미제공')
    expect(typeLabel('mystery')).toBe('mystery')
  })
  it('비유한 숫자는 0 이 아니라 대시', () => {
    expect(numberLabel(NaN)).toBe('—')
    expect(numberLabel(null)).toBe('—')
    expect(numberLabel(undefined)).toBe('—')
    expect(numberLabel(Infinity)).toBe('—')
    expect(numberLabel(0)).toBe('0')
  })
})

describe('cursorTransition', () => {
  it('first / next / duplicate / gap / rewind / restart / invalid', () => {
    expect(cursorTransition(null, 'a:1')).toBe('first')
    expect(cursorTransition('a:1', 'a:2')).toBe('next')
    expect(cursorTransition('a:2', 'a:2')).toBe('duplicate')
    expect(cursorTransition('a:2', 'a:5')).toBe('gap')
    expect(cursorTransition('a:5', 'a:2')).toBe('rewind')
    expect(cursorTransition('a:5', 'b:6')).toBe('restart')
    expect(cursorTransition('a:5', '')).toBe('invalid')
    expect(cursorTransition('a:5', '7')).toBe('invalid')
  })
  it('instance 에 콜론이 있어도 마지막 콜론 기준으로 파싱', () => {
    expect(cursorTransition('x:y:1', 'x:y:2')).toBe('next')
  })
})
