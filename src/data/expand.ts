export interface Pack {
  columns: string[]
  rows: unknown[][]
}

/** 컬럼형 {columns, rows} 를 행 객체 배열로 펼친다. */
export function expand<T>(pack: Pack): T[] {
  return pack.rows.map((values) => Object.fromEntries(pack.columns.map((key, i) => [key, values[i]])) as T)
}
