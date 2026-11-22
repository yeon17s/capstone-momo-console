interface MetricCardProps {
  label: string
  value: string
  sub?: string
}

export function MetricCard({ label, value, sub = '' }: MetricCardProps) {
  return (
    <article className="card metric">
      <div className="muted">{label}</div>
      <strong>{value}</strong>
      <small>{sub}</small>
    </article>
  )
}
