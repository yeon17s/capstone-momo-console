import { DB } from '../data/db'
import type { CycleRow, ModelSelection } from '../types'

export const sameModel =
  (sel: ModelSelection) =>
  (r: ModelSelection): boolean =>
    r.representation === sel.representation &&
    r.input_set === sel.input_set &&
    r.algorithm === sel.algorithm

export const findModel = (sel: ModelSelection, scope: string) =>
  DB.models.find((r) => sameModel(sel)(r) && r.scope === scope)

export const evaluationRows = (sel: ModelSelection): CycleRow[] =>
  DB.cycles.filter((r) => sameModel(sel)(r) && r.split === 'evaluation')

/** friction_weight scope 는 정상 + category 0/1 만 포함. */
export const scopedRows = (sel: ModelSelection, scope: string): CycleRow[] =>
  evaluationRows(sel).filter(
    (r) => scope === 'all_12' || !r.anomaly || [0, 1].includes(r.category),
  )

export const resultKey = (r: CycleRow) =>
  [r.sample, r.representation, r.input_set, r.algorithm].join('/')

export const outcome = (r: CycleRow): string =>
  r.anomaly
    ? r.prediction
      ? '이상 탐지 성공 (TP)'
      : '미탐 · 이상을 놓침 (FN)'
    : r.prediction
      ? '오탐 · 잘못된 경보 (FP)'
      : '정상 판정 성공 (TN)'
