import type { ReactNode } from 'react'
import { Empty } from './Empty'
import { Notice } from './Notice'

/**
 * API 데이터의 비정상·비정형 상태를 정상 값과 구분해 표시한다.
 * 어떤 상태도 '정상(초록)'이나 0 으로 바꾸지 않는다.
 */
export type AsyncKind = 'loading' | 'empty' | 'no_data' | 'stale' | 'error' | 'unjudged'

const DEFAULT_TEXT: Record<AsyncKind, string> = {
  loading: '불러오는 중입니다.',
  empty: '조건에 맞는 결과가 없습니다.',
  no_data: '기록된 데이터가 없습니다. (no_data)',
  stale: '원본 로그가 갱신되지 않고 있습니다. 표시된 값은 마지막 관측값입니다.',
  error: '데이터를 불러오지 못했습니다.',
  unjudged: '미판정입니다. 정상으로 간주하지 않습니다.',
}

interface AsyncStateProps {
  kind: AsyncKind
  children?: ReactNode
}

export function AsyncState({ kind, children }: AsyncStateProps) {
  const text = children ?? DEFAULT_TEXT[kind]
  if (kind === 'loading' || kind === 'empty' || kind === 'no_data') {
    return (
      <div role="status" aria-live="polite">
        <Empty>{text}</Empty>
      </div>
    )
  }
  return (
    <div role={kind === 'error' ? 'alert' : 'status'}>
      <Notice warning>{text}</Notice>
    </div>
  )
}
