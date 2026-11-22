import type { CSSProperties, ReactNode } from 'react'

interface NoticeProps {
  warning?: boolean
  style?: CSSProperties
  children: ReactNode
}

export function Notice({ warning, style, children }: NoticeProps) {
  return (
    <div className={warning ? 'notice warning' : 'notice'} style={style}>
      {children}
    </div>
  )
}
