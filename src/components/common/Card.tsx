import type { CSSProperties, ReactNode } from 'react'

interface CardProps {
  as?: 'article' | 'details'
  className?: string
  style?: CSSProperties
  children: ReactNode
}

export function Card({ as: Tag = 'article', className = '', style, children }: CardProps) {
  return (
    <Tag className={('card ' + className).trim()} style={style}>
      {children}
    </Tag>
  )
}
