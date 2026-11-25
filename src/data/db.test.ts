// 공개 평가 스냅샷(payload.json)의 불변식. 파싱은 데이터 생성 단계에서 끝났으므로 결과물을 직접 검사한다.
import { describe, expect, it } from 'vitest'
import { DB } from './db'
import { evaluationRows, scopedRows } from '../lib/selectors'
import { historyCsvText } from '../lib/exportCsv'
import type { CycleRow, ModelSelection } from '../types'

const selections: ModelSelection[] = [
  ...new Map(
    DB.cycles.map((r) => [
      `${r.representation}|${r.input_set}|${r.algorithm}`,
      { representation: r.representation, input_set: r.input_set, algorithm: r.algorithm },
    ]),
  ).values(),
]

const isBoolOrNull = (v: unknown) => v === null || typeof v === 'boolean'

describe('공개 평가 스냅샷: 타입', () => {
  it('18개 모델 구성', () => {
    expect(selections).toHaveLength(18)
  })
  it('anomaly·prediction 은 boolean 또는 null (문자열 TRUE/FALSE·빈 문자열 아님)', () => {
    const bad = DB.cycles.filter((r) => !isBoolOrNull(r.anomaly) || !isBoolOrNull(r.prediction))
    expect(bad).toHaveLength(0)
  })
  it('score·threshold 는 유한한 숫자 또는 null (NaN·문자열 아님)', () => {
    const ok = (v: unknown) => v === null || (typeof v === 'number' && Number.isFinite(v))
    expect(DB.cycles.filter((r) => !ok(r.score) || !ok(r.threshold))).toHaveLength(0)
  })
})

describe('공개 평가 스냅샷: score > threshold 의미', () => {
  it('판정이 있는 행은 모델별 threshold 로 prediction === (score > threshold)', () => {
    const rows = DB.cycles.filter(
      (r) => typeof r.prediction === 'boolean' && typeof r.score === 'number' && typeof r.threshold === 'number',
    )
    expect(rows.length).toBeGreaterThan(0)
    const mismatch = rows.filter((r) => r.prediction !== r.score > r.threshold)
    expect(mismatch).toHaveLength(0)
  })
  it('점수나 threshold 가 없는 행은 판정을 만들지 않는다', () => {
    const bad = DB.cycles.filter(
      (r) => (r.score === null || r.threshold === null) && typeof r.prediction === 'boolean',
    )
    expect(bad).toHaveLength(0)
  })
  it('모델 구성마다 threshold 가 하나이고 구성 간에 다를 수 있다 (전역 고정값 아님)', () => {
    const per = selections.map((s) => new Set(evaluationRows(s).map((r) => r.threshold)))
    expect(per.every((set) => set.size === 1)).toBe(true)
    const distinct = new Set(per.map((set) => [...set][0]))
    expect(distinct.size).toBeGreaterThan(1)
  })
})

describe('공개 평가 스냅샷: 평가 행 수·confusion matrix', () => {
  it.each(selections.map((s) => [`${s.representation}/${s.input_set}/${s.algorithm}`, s] as const))(
    '%s: 평가 1174행 = 정상 419 + 이상 755, matrix 합계 일치',
    (_name, sel) => {
      const rows = evaluationRows(sel)
      expect(rows).toHaveLength(1174)
      expect(rows.filter((r) => r.anomaly === false)).toHaveLength(419)
      expect(rows.filter((r) => r.anomaly === true)).toHaveLength(755)

      const m = DB.models.find((x) => x.representation === sel.representation && x.input_set === sel.input_set && x.algorithm === sel.algorithm && x.scope === 'all_12')!
      expect(m).toBeDefined()
      expect(m.tn + m.fp).toBe(m.n_normal)
      expect(m.fn + m.tp).toBe(m.n_anomaly)
      expect(m.tn + m.fp + m.fn + m.tp).toBe(1174)

      // 행 단위 재계산과 요약표가 일치해야 한다
      const count = (a: boolean, p: boolean) => rows.filter((r) => r.anomaly === a && r.prediction === p).length
      expect({ tn: count(false, false), fp: count(false, true), fn: count(true, false), tp: count(true, true) }).toEqual({
        tn: m.tn, fp: m.fp, fn: m.fn, tp: m.tp,
      })
    },
  )

  it('scope 별 분모: 행에서 센 정상/이상 수가 모델 요약표와 같다', () => {
    const mismatches: string[] = []
    for (const m of DB.models) {
      const rows = scopedRows(m, m.scope)
      const normal = rows.filter((r) => r.anomaly === false).length
      const anomaly = rows.filter((r) => r.anomaly === true).length
      if (normal !== m.n_normal || anomaly !== m.n_anomaly) {
        mismatches.push(`${m.representation}/${m.input_set}/${m.algorithm}/${m.scope}: ${normal}/${anomaly} vs ${m.n_normal}/${m.n_anomaly}`)
      }
    }
    expect(mismatches).toEqual([])
  })
})

describe('공개 평가 CSV 내보내기', () => {
  const row = (over: Partial<CycleRow>): CycleRow => ({
    sample: 1, category: 0, setting: 1, anomaly: null, category_name: '=SUM(A1)', variant_name: 'v',
    split: 'evaluation', score: null as unknown as number, threshold: 0.5, prediction: null,
    representation: 'cycle', input_set: 'A', algorithm: 'statistical', ...over,
  })
  const text = historyCsvText([row({})], ['sample', 'anomaly', 'prediction', 'score', 'threshold', 'category_name'])

  it('UTF-8 BOM 으로 시작', () => {
    expect(text.charCodeAt(0)).toBe(0xfeff)
  })
  it('null 은 빈 셀이며 0·정상(false)으로 바뀌지 않는다', () => {
    const cells = text.split('\r\n')[1].split(',')
    expect(cells.slice(1, 4)).toEqual(['""', '""', '""'])
  })
  it('수식 인젝션 방지: 문자열 =,+,@,- 시작은 작은따옴표 접두', () => {
    expect(text).toContain(`"'=SUM(A1)"`)
  })
  it('숫자는 접두하지 않고, 불리언은 그대로', () => {
    const t = historyCsvText([row({ score: -1.5, anomaly: false })], ['score', 'anomaly'])
    expect(t.split('\r\n')[1]).toBe('"-1.5","false"')
  })
})
