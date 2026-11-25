import { XarmMetricsPanel } from './XarmMetricsPanel'
import { XarmStatusCards } from './XarmStatusCards'

export function XarmDashboard() {
  return (
    <div className="stack">
      <XarmStatusCards />
      <XarmMetricsPanel />
    </div>
  )
}
