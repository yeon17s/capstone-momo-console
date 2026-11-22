import { SelectField } from '../common'

export interface HistoryFilterState {
  search: string
  truth: string
  prediction: string
  sort: string
  desc: boolean
}

interface Props {
  filters: HistoryFilterState
  onChange: (patch: Partial<HistoryFilterState>) => void
  onDownload: () => void
  downloadDisabled: boolean
}

const TRUTH_OPTIONS = [
  ['all', '전체'],
  ['false', '실제 정상'],
  ['true', '실제 이상'],
]
const PREDICTION_OPTIONS = [
  ['all', '전체'],
  ['false', '정상 판정'],
  ['true', '이상 판정'],
]
const SORT_OPTIONS = ['sample', 'score', 'category_name']

function LabeledSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[][]
  onChange: (v: string) => void
}) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map(([v, text]) => (
          <option key={v} value={v}>
            {text}
          </option>
        ))}
      </select>
    </label>
  )
}

export function HistoryFilters({ filters, onChange, onDownload, downloadDisabled }: Props) {
  return (
    <div className="toolbar">
      <label>
        검색
        <input
          type="search"
          placeholder="sample, 유형, 조건"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
        />
      </label>
      <LabeledSelect
        label="실제 라벨"
        value={filters.truth}
        options={TRUTH_OPTIONS}
        onChange={(truth) => onChange({ truth })}
      />
      <LabeledSelect
        label="모델 판정"
        value={filters.prediction}
        options={PREDICTION_OPTIONS}
        onChange={(prediction) => onChange({ prediction })}
      />
      <SelectField
        label="정렬"
        value={filters.sort}
        options={SORT_OPTIONS}
        onChange={(sort) => onChange({ sort })}
      />
      <label className="check">
        <input
          type="checkbox"
          checked={filters.desc}
          onChange={(e) => onChange({ desc: e.target.checked })}
        />
        내림차순
      </label>
      <button className="primary" disabled={downloadDisabled} onClick={onDownload}>
        필터 결과 CSV 저장
      </button>
    </div>
  )
}
