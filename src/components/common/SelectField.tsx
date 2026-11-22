interface SelectFieldProps {
  label: string
  value: string
  options: (string | number)[]
  onChange: (value: string) => void
  emptyLabel?: string
}

export function SelectField({ label, value, options, onChange, emptyLabel }: SelectFieldProps) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {options.map((v) => (
          <option key={v} value={String(v)}>
            {v}
          </option>
        ))}
      </select>
    </label>
  )
}
