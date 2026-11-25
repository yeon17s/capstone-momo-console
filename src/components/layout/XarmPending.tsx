import { useApi } from '../../context/ApiContext'
import { useSource } from '../../context/SourceContext'
import { numberLabel } from '../../lib/api'
import { AsyncState, Card, Notice } from '../common'

/**
 * xArm 모드의 화면 본문이 구현되기 전까지 공개 평가 데이터가 섞여 보이지 않도록 대신 표시한다.
 * 서버가 알려 준 mode/freshness 를 그대로 보여 주며 정상·0 으로 바꾸지 않는다.
 */
export function XarmPending() {
  const { mode } = useSource()
  const { status, connection, error } = useApi()
  const latest = status?.latest ?? null

  return (
    <section aria-label="xArm 연결 상태">
      <h2>{mode === 'xarm-live' ? 'xArm 현재 상태' : 'xArm 저장 이력'}</h2>
      {mode === 'xarm-live' && (
        <Notice warning>
          mode=live는 서버가 로그 갱신을 관찰했다는 뜻입니다. 장비 안전·운전·운반 성공을 보증하지
          않습니다.
        </Notice>
      )}
      {error && <AsyncState kind="error">{error}</AsyncState>}
      {!status && !error && <AsyncState kind="loading" />}
      {status && (
        <Card>
          <h3>서버 응답 요약</h3>
          <ul>
            <li>
              서버 mode: <code>{status.mode}</code> · 서버 시각 <code>{status.server_time_utc}</code>
            </li>
            <li>
              연결: <code>{connection}</code>
              {connection === 'reconnecting' || connection === 'offline'
                ? ' (표시된 값은 마지막 관측값입니다)'
                : ''}
            </li>
            <li>
              freshness: <code>{latest?.freshness.status ?? 'no_data'}</code>
              {latest?.freshness.age_s != null && <> · age {numberLabel(latest.freshness.age_s, 1)} s</>}
            </li>
          </ul>
          {status.mode === 'no_data' && <AsyncState kind="no_data" />}
          {latest?.freshness.status === 'stale' && <AsyncState kind="stale" />}
          <p className="caption">
            이 화면의 상세 카드·이력 표는 다음 단계에서 연결합니다. 현재는 연결 상태만 표시합니다.
          </p>
        </Card>
      )}
    </section>
  )
}
