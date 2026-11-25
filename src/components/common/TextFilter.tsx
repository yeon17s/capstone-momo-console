/** 목록 값과 정확히 일치해야 하는 텍스트 필터. 현재 페이지의 값으로 자동완성한다. */
export function TextFilter({
  label,
  value,
  onChange,
  options,
  listId,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  listId: string
}) {
  return (
    <label>
      {label}
      <input list={listId} value={value} onChange={(e) => onChange(e.target.value)} />
      <datalist id={listId}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </label>
  )
}

export function uniqueValues<T>(items: T[], pick: (item: T) => string | null | undefined): string[] {
  return [...new Set(items.map(pick).filter((v): v is string => !!v))]
}
