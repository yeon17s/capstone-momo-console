import type { CycleRow } from '../types'

export const resultKey = (r: CycleRow) =>
  [r.sample, r.representation, r.input_set, r.algorithm].join('/')
