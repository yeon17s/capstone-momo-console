import { useState } from 'react'
import { DB } from '../data/db'
import { useSource } from '../context/SourceContext'
import { useModel } from '../context/ModelContext'
import { uniq } from '../lib/format'
import { findModel } from '../lib/selectors'
import { SectionTitle, SelectField } from '../components/common'
import {
  DetailTables,
  ModelMetrics,
  OverviewKpis,
  VisualSummary,
  XarmDashboard,
} from '../components/dashboard'

function PublicDashboard() {
  const { model } = useModel()
  const [scope, setScope] = useState('all_12')
  const m = findModel(model, scope)

  return (
    <section aria-label="대시보드">
      <OverviewKpis />
      <SectionTitle title="Baseline 모델 성능">
        <SelectField
          label="지표 집계 scope"
          value={scope}
          options={uniq(DB.models, 'scope')}
          onChange={setScope}
        />
      </SectionTitle>
      {m && <ModelMetrics m={m} />}
      {m && <VisualSummary m={m} scope={scope} />}
      <DetailTables m={m} />
    </section>
  )
}

export default function DashboardPage() {
  const { mode } = useSource()
  return mode === 'public' ? <PublicDashboard /> : <XarmDashboard />
}
