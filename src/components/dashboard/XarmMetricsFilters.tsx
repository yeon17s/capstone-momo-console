import { useApi } from '../../context/ApiContext'
import type { XarmFilterState } from '../../lib/api/historyFilters'
import { TextFilter, uniqueValues } from '../common'

interface Props {
  filters: XarmFilterState
  onChange: (patch: Partial<XarmFilterState>) => void
  onReset: () => void
}

/** 평가 범위 필터 (세션·출처·모델·기간·경보 결과). 값 자동완성은 마지막으로 읽은 이력 페이지에서 가져온다. */
export function XarmMetricsFilters({ filters, onChange, onReset }: Props) {
  const items = useApi().cycles?.items ?? []
  return (
    <div className="toolbar" role="search" aria-label="평가 범위 필터">
      <TextFilter
        label="세션 (run_id)"
        value={filters.run_id}
        onChange={(v) => onChange({ run_id: v })}
        options={uniqueValues(items, (c) => c.run_id)}
        listId="dl-m-run"
      />
      <TextFilter
        label="출처 그룹"
        value={filters.source_group}
        onChange={(v) => onChange({ source_group: v })}
        options={uniqueValues(items, (c) => c.source_group)}
        listId="dl-m-source"
      />
      <TextFilter
        label="모델 프로필"
        value={filters.model_profile}
        onChange={(v) => onChange({ model_profile: v })}
        options={uniqueValues(items, (c) => c.model_profile)}
        listId="dl-m-profile"
      />
      <label>
        수집 시작 (로컬 시간)
        <input type="datetime-local" value={filters.from} onChange={(e) => onChange({ from: e.target.value })} />
      </label>
      <label>
        수집 종료 (로컬 시간)
        <input type="datetime-local" value={filters.to} onChange={(e) => onChange({ to: e.target.value })} />
      </label>
      <label>
        경보 결과로 거르기
        <select value={filters.alarm} onChange={(e) => onChange({ alarm: e.target.value as XarmFilterState['alarm'] })}>
          <option value="all">거르지 않음</option>
          <option value="true">이상 경보만</option>
          <option value="false">미경보만</option>
          <option value="null">미판정만</option>
        </select>
      </label>
      <button type="button" onClick={onReset}>
        범위 초기화
      </button>
    </div>
  )
}
