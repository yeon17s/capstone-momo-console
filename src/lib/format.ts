const isNum = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v)

export const num = (v: unknown, digits = 3): string =>
  isNum(v)
    ? v.toLocaleString('ko-KR', { maximumFractionDigits: digits })
    : '—'

export const pct = (v: unknown): string =>
  isNum(v) ? num(v * 100, 2) + '%' : '—'

export const dash = (v: unknown): string => String(v ?? '—')

export const uniq = <T, K extends keyof T>(rows: T[], key: K): T[K][] =>
  [...new Set(rows.map((r) => r[key]))].sort()
