export interface FlatRow {
  path: string
  /** 화면 표시용 문자열. 숫자는 반올림하지 않고 원문 그대로 둔다(임계값 보존). */
  value: string
  kind: 'string' | 'number' | 'boolean' | 'null'
}

const MAX_ROWS = 1000

/**
 * 서버 응답을 `경로 → 값` 행으로 펼친다. 필드 이름을 가정하지 않고 응답에 있는 값만 보여 주기 위한 용도다.
 * 값은 문자열로만 반환하므로 JSX 텍스트로 렌더링하면 HTML 로 해석되지 않는다.
 */
export function flattenJson(value: unknown, root = ''): FlatRow[] {
  const rows: FlatRow[] = []
  const visit = (v: unknown, path: string) => {
    if (rows.length >= MAX_ROWS) return
    if (v === null || v === undefined) {
      rows.push({ path, value: 'null (미제공)', kind: 'null' })
    } else if (Array.isArray(v)) {
      if (v.length === 0) rows.push({ path, value: '[] (비어 있음)', kind: 'null' })
      v.forEach((item, i) => visit(item, `${path}[${i}]`))
    } else if (typeof v === 'object') {
      const entries = Object.entries(v as Record<string, unknown>)
      if (entries.length === 0) rows.push({ path, value: '{} (비어 있음)', kind: 'null' })
      for (const [k, item] of entries) visit(item, path ? `${path}.${k}` : k)
    } else if (typeof v === 'number') {
      rows.push({ path, value: Number.isFinite(v) ? String(v) : '비유한 값', kind: 'number' })
    } else if (typeof v === 'boolean') {
      rows.push({ path, value: String(v), kind: 'boolean' })
    } else {
      rows.push({ path, value: String(v), kind: 'string' })
    }
  }
  visit(value, root)
  return rows
}
