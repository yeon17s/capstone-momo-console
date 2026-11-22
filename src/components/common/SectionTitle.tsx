import type { ReactNode } from 'react'

export function SectionTitle({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="title">
      <h2>{title}</h2>
      {children}
    </div>
  )
}
