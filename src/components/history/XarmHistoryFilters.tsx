import type { Cycle } from '../../types/api'
import { TextFilter, uniqueValues } from '../common'
import { PAGE_LIMITS, TRUTH_LABELS, type XarmFilterState } from '../../lib/api/historyFilters'

interface Props {
  filters: XarmFilterState
  onChange: (patch: Partial<XarmFilterState>) => void
  onReset: () => void
  limit: number
  onLimit: (limit: number) => void
  search: string
  onSearch: (v: string) => void
  /** 현재 페이지 값 — 입력 자동완성용 (필터 값은 목록 값과 정확히 일치해야 한다) */
  items: Cycle[]
}

export function XarmHistoryFilters({
  filters,
  onChange,
  onReset,
  limit,
  onLimit,
  search,
  onSearch,
  items,
}: Props) {
  return (
    <div className="toolbar" role="search" aria-label="xArm 이력 필터 (서버 필터)">
      <label>
        원 경보 결과
        <select value={filters.alarm} onChange={(e) => onChange({ alarm: e.target.value as XarmFilterState['alarm'] })}>
          <option value="all">전체</option>
          <option value="true">이상 경보</option>
          <option value="false">미경보</option>
          <option value="null">미판정</option>
        </select>
      </label>
      <label>
        실제 확인 여부
        <select
          value={filters.confirmed}
          onChange={(e) => onChange({ confirmed: e.target.value as XarmFilterState['confirmed'] })}
        >
          <option value="all">전체</option>
          <option value="true">확인됨</option>
          <option value="false">미확정</option>
        </select>
      </label>
      <label>
        실제 라벨
        <select value={filters.label} onChange={(e) => onChange({ label: e.target.value as XarmFilterState['label'] })}>
          <option value="">전체</option>
          {TRUTH_LABELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <TextFilter
        label="계획 조건"
        value={filters.condition}
        onChange={(v) => onChange({ condition: v })}
        options={uniqueValues(items, (c) => c.condition)}
        listId="dl-condition"
      />
      <TextFilter
        label="run_id"
        value={filters.run_id}
        onChange={(v) => onChange({ run_id: v })}
        options={uniqueValues(items, (c) => c.run_id)}
        listId="dl-run"
      />
      <TextFilter
        label="모델 프로필"
        value={filters.model_profile}
        onChange={(v) => onChange({ model_profile: v })}
        options={uniqueValues(items, (c) => c.model_profile)}
        listId="dl-profile"
      />
      <TextFilter
        label="출처 그룹"
        value={filters.source_group}
        onChange={(v) => onChange({ source_group: v })}
        options={uniqueValues(items, (c) => c.source_group)}
        listId="dl-source"
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
        페이지 크기
        <select value={limit} onChange={(e) => onLimit(Number(e.target.value))}>
          {PAGE_LIMITS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label>
        현재 페이지 내 검색
        <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="서버 검색 아님" />
      </label>
      <button type="button" onClick={onReset}>
        필터 초기화
      </button>
    </div>
  )
}
