import { useMemo, useState } from 'react'
import {
  availableActions,
  availableSettings,
  availableSignals,
  seriesFor,
  type AlignedData,
} from '../../lib/aligned'
import { BandChart } from '../charts'
import { AsyncState, Badge, Card, SelectField } from '../common'

const GROUP_COLORS: Record<string, string> = { PRE_A: '#4D86E8', Anomaly: '#D96B2A', NORMAL: '#6CC59B' }

/** 공개 데이터의 정렬 시계열(중앙값·q10~q90). 약 2.7MB 라 열 때만 불러온다. */
export function AlignedTimeseriesCard() {
  const [data, setData] = useState<AlignedData | null>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [sel, setSel] = useState<{ setting?: number; action?: number; signal?: string }>({})

  const load = async () => {
    setState('loading')
    try {
      const mod = await import('../../data/aligned.json')
      setData(mod.default as unknown as AlignedData)
      setState('idle')
    } catch {
      setState('error')
    }
  }

  const settings = useMemo(() => (data ? availableSettings(data) : []), [data])
  const setting = sel.setting !== undefined && settings.includes(sel.setting) ? sel.setting : settings[0]
  const actions = useMemo(() => (data && setting !== undefined ? availableActions(data, setting) : []), [data, setting])
  const action = sel.action !== undefined && actions.includes(sel.action) ? sel.action : actions[0]
  const signals = useMemo(
    () => (data && setting !== undefined && action !== undefined ? availableSignals(data, setting, action) : []),
    [data, setting, action],
  )
  const signal = sel.signal && signals.includes(sel.signal) ? sel.signal : signals[0]
  const groups = useMemo(
    () => (data && setting !== undefined && action !== undefined && signal ? seriesFor(data, setting, action, signal) : []),
    [data, setting, action, signal],
  )
  const bands = useMemo(
    () =>
      groups.map((g) => ({
        name: `${g.group} (n=${g.n})`,
        color: GROUP_COLORS[g.group] ?? '#B58CE8',
        m: g.m,
        lo: g.lo,
        hi: g.hi,
      })),
    [groups],
  )

  return (
    <Card>
      <h2>
        정렬 시계열 <Badge tone="warn">공개 EDA · 탐색용</Badge>
      </h2>
      <p className="caption" style={{ marginTop: 0 }}>
        x축은 구간 내 정렬 진행률(progress_percent)이며 실제 시각(초)이 아닙니다. 원시 History·샘플이
        아니고, 같은 setting·Action끼리만 비교합니다. 값은 표시용으로 유효숫자 4자리로 줄였습니다.
      </p>
      {!data && (
        <button type="button" onClick={load} disabled={state === 'loading'}>
          {state === 'loading' ? '불러오는 중…' : '정렬 시계열 불러오기 (약 2.7MB)'}
        </button>
      )}
      {state === 'error' && <AsyncState kind="error">정렬 시계열을 불러오지 못했습니다.</AsyncState>}
      {data && setting !== undefined && (
        <>
          <div className="subtools">
            <label>
              setting
              <select value={setting} onChange={(e) => setSel({ setting: Number(e.target.value) })}>
                {settings.map((s) => (
                  <option key={s} value={s}>
                    {`setting ${s} · 영향 관절 ${data.settings[String(s)]}`}
                  </option>
                ))}
              </select>
            </label>
            <SelectField label="Action" value={String(action)} options={actions} onChange={(v) => setSel({ setting, action: Number(v) })} />
            <SelectField label="신호" value={signal ?? ''} options={signals} onChange={(v) => setSel({ setting, action, signal: v })} />
          </div>
          {bands.length ? (
            <BandChart x={data.progress} series={bands} label={`setting ${setting} Action ${action} ${signal} 정렬 시계열`} />
          ) : (
            <AsyncState kind="empty">이 조합에 해당하는 계열이 없습니다.</AsyncState>
          )}
          <p className="caption">
            선: 중앙값, 띠: q10~q90. 그룹별 n은 계열을 이루는 사이클 수이며 그룹마다 다를 수 있습니다.
            마찰·관절 추가하중 기반 기존 EDA이며 자연 마모나 미래 예측 검증이 아닙니다.
          </p>
        </>
      )}
    </Card>
  )
}
