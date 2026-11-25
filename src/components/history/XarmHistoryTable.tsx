import { alarmLabel, typeLabel } from '../../lib/api'
import type { Cycle } from '../../types/api'
import { Badge, Table } from '../common'

function text(v: unknown): string {
  return v === null || v === undefined || v === '' ? '미제공' : String(v)
}

function confirmedLabel(c: Cycle): string {
  const v = c.operator?.confirmed
  return v === true ? '확인됨' : v === false ? '미확정' : '미제공'
}

interface Props {
  items: Cycle[]
  selected: string[]
  onToggle: (id: string) => void
}

export function XarmHistoryTable({ items, selected, onToggle }: Props) {
  return (
    <Table
      headers={[
        '수집 시각 (UTC)',
        'run · 회차',
        '계획 조건',
        '실제 확인',
        '실제 라벨',
        '원 경보',
        '원 유형',
        '보조 추정',
        '모델 프로필',
        '자료 종류',
        '상세',
      ]}
      rows={items.map((c) => {
        const alarm = c.detectors?.combined?.alarm
        return [
          text(c.captured_utc),
          `${text(c.run_id)} · ${text(c.cycle?.index)}`,
          text(c.condition),
          confirmedLabel(c),
          text(c.operator?.label),
          <Badge key="a" tone={alarm === true ? 'bad' : alarm === null || alarm === undefined ? 'warn' : ''}>
            {alarmLabel(alarm)}
          </Badge>,
          typeLabel(c.detectors?.combined?.type),
          typeLabel(c.auxiliary?.estimated_type),
          <span key="m">
            {text(c.model_profile)}
            {c.model_profile === 'old_logistic_gru' && (
              <>
                {' '}
                <Badge tone="warn">과거 로지스틱/GRU</Badge>
              </>
            )}
          </span>,
          text(c.data_kind),
          <button key="o" type="button" aria-pressed={selected.includes(c.id)} onClick={() => onToggle(c.id)}>
            {selected.includes(c.id) ? '닫기' : '열기'}
          </button>,
        ]
      })}
    />
  )
}
