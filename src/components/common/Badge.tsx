import type { ReactNode } from 'react'

export type BadgeTone = 'blue' | 'warn' | 'good' | 'bad' | ''

export function Badge({ tone = '', children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={('badge ' + tone).trim()}>{children}</span>
}

export function StateBadge({ value }: { value: boolean | null | undefined }) {
  if (value == null) return <Badge>미평가</Badge>
  return <Badge tone={value ? 'bad' : 'good'}>{value ? '이상' : '정상'}</Badge>
}
