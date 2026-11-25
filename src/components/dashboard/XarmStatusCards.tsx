import { NavLink } from 'react-router-dom'
import { useApi } from '../../context/ApiContext'
import { useSource } from '../../context/SourceContext'
import { alarmLabel, numberLabel, typeLabel } from '../../lib/api'
import type { Alarm, Cycle, Detector } from '../../types/api'
import { AsyncState, Badge, Card, MetricCard, Notice, Table, type BadgeTone } from '../common'

function alarmTone(a: Alarm | undefined): BadgeTone {
  // false(미경보)를 초록 '정상'으로 표시하지 않는다. 결손·미관측 여부는 별도 품질 필드로 판단한다.
  if (a === true) return 'bad'
  if (a === null || a === undefined) return 'warn'
  return ''
}

function text(v: unknown): string {
  return v === null || v === undefined || v === '' ? '미제공' : String(v)
}

function validBadge(valid: boolean | null | undefined) {
  if (valid === true) return <Badge tone="blue">valid</Badge>
  if (valid === false) return <Badge tone="warn">valid=false</Badge>
  return <Badge>valid 미제공</Badge>
}

function DetectorRow({ name, d }: { name: string; d: Detector | null | undefined }) {
  return (
    <tr>
      <td>{name}</td>
      <td>{numberLabel(d?.score, 6)}</td>
      <td>{numberLabel(d?.threshold, 15)}</td>
      <td>
        <Badge tone={alarmTone(d?.alarm)}>{alarmLabel(d?.alarm)}</Badge>
      </td>
    </tr>
  )
}

function Detection({ r }: { r: Cycle }) {
  const d = r.detectors
  const combined = d?.combined
  const aux = r.auxiliary
  const keepsAlarm = combined?.alarm === true && aux?.estimated_type === 'normal_like'
  return (
    <Card>
      <h3>경보와 유형</h3>
      <div className="kpis">
        <MetricCard
          label="원 경보 (CB OR GRU)"
          value={alarmLabel(combined?.alarm)}
          sub="OR 합성 점수는 없습니다"
        />
        <MetricCard label="원 유형 (combined.type)" value={typeLabel(combined?.type)} sub="보조 추정으로 덮어쓰지 않음" />
        <MetricCard
          label="보조 추정 (auxiliary)"
          value={typeLabel(aux?.estimated_type)}
          sub={`상태 ${text(aux?.estimate_status)}${aux?.tentative ? ' · 잠정' : ''}`}
        />
      </div>
      {keepsAlarm && (
        <Notice warning>원 경보는 이상이며, 보조 추정이 정상 유사여도 경보는 유지됩니다.</Notice>
      )}
      {d?.logistic ? (
        <>
          <Notice warning>
            과거 프로필(<code>{text(r.model_profile)}</code>)의 기록된 로지스틱/GRU 결과입니다. 현재
            CatBoost 결과가 아닙니다.
          </Notice>
          <table>
            <thead>
              <tr>
                <th>검출기</th>
                <th>점수</th>
                <th>임계값</th>
                <th>경보</th>
              </tr>
            </thead>
            <tbody>
              <DetectorRow name="Logistic (기록)" d={d.logistic} />
              <DetectorRow name="GRU" d={d.gru} />
            </tbody>
          </table>
        </>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>검출기</th>
                <th>점수</th>
                <th>임계값</th>
                <th>경보</th>
              </tr>
            </thead>
            <tbody>
              <DetectorRow name="CatBoost (회차 종료 시)" d={d?.catboost} />
              <DetectorRow name="GRU (동작 중)" d={d?.gru} />
            </tbody>
          </table>
        </div>
      )}
      <p className="caption">
        점수는 모델별 값이며 확률·미래 위험이 아닙니다. 두 점수를 더하거나 평균하지 않습니다. 보조 유형
        확률은 미교정 분류 확률입니다. 입력 결손이 있으면 경보 false만으로 완전한 정상 관측이라고 볼 수
        없습니다.
      </p>
    </Card>
  )
}

function Sensors({ r }: { r: Cycle }) {
  const s = r.sensors
  const ina = s?.ina
  const adxl = s?.adxl
  const positions = s?.positions ?? {}
  const ids = ['1', '2', '3', '4', '5', '6']
  return (
    <Card>
      <h3>센서 (마지막 로그 기준)</h3>
      <div className="kpis">
        <MetricCard label="INA 전체 공급 전류" value={`${numberLabel(ina?.current_A)} A`} sub="관절별 전류가 아님" />
        <MetricCard label="INA 전압" value={`${numberLabel(ina?.voltage_V)} V`} sub={`전력 ${numberLabel(ina?.power_W)} W`} />
        <MetricCard
          label="가속도 (중력 포함)"
          value={`${numberLabel(adxl?.x_g)} / ${numberLabel(adxl?.y_g)} / ${numberLabel(adxl?.z_g)} g`}
          sub="x / y / z"
        />
      </div>
      <p>
        INA {validBadge(ina?.valid)} · ADXL {validBadge(adxl?.valid)}
      </p>
      <Table
        headers={['서보 ID', '위치 (raw)', '유효']}
        rows={ids.map((id) => [
          id,
          numberLabel(positions[id]?.position_raw, 0),
          validBadge(positions[id]?.valid),
        ])}
      />
      <p className="caption">
        위치 6개는 순차 조회이며 동시 측정이 아닙니다. 단위는 A / V / W / g / raw이고, 각도·개별 모터
        전류·토크·서보 온도가 아닙니다. 센서 개별 UTC와 현재 센서 age는 제공되지 않습니다.
      </p>
    </Card>
  )
}

function Quality({ r }: { r: Cycle }) {
  const q = r.quality
  return (
    <Card>
      <h3>수집 품질</h3>
      <div className="kpis">
        <MetricCard label="누락 슬롯" value={numberLabel(q?.missing_slots, 0)} sub="명목 200ms 대비 실제 발행 간격과 별개" />
        <MetricCard label="위치 soft timeout" value={numberLabel(q?.position_soft_timeouts, 0)} sub="관절 순차 응답 지연" />
        <MetricCard label="phase 품질" value={text(q?.phase_quality)} sub={q?.error ? `오류: ${q.error}` : '오류 없음 보고'} />
      </div>
      <p className="caption">
        누락·순차 응답 지연을 웹 전송 지연으로 해석하지 않습니다. 값이 &quot;—&quot;이면 서버가 제공하지 않은
        것입니다.
      </p>
    </Card>
  )
}

function Cycle_({ r, live }: { r: Cycle; live: boolean }) {
  const op = r.operator
  return (
    <Card>
      <h3>{live ? '현재 회차' : '최근 저장 회차'}</h3>
      <div className="kpis">
        <MetricCard label="회차 / phase" value={`${text(r.cycle?.index)} · ${text(r.cycle?.phase)}`} sub={`run ${text(r.run_id)}`} />
        <MetricCard label="freshness" value={text(r.freshness.status)} sub={`age ${numberLabel(r.freshness.age_s, 1)} s · ${text(r.freshness.reason)}`} />
        <MetricCard label="기록 시각 (UTC)" value={text(r.updated_utc ?? r.captured_utc)} sub={`${text(r.data_kind)} · ${text(r.source?.scope)}`} />
      </div>
      <Table
        headers={['구분', '값']}
        rows={[
          ['계획 조건 (condition, 정답 아님)', text(r.condition)],
          ['실제 확인 여부 (operator.confirmed)', op?.confirmed === true ? '확인됨' : op?.confirmed === false ? '미확정' : '미제공'],
          ['실제 라벨 (operator.label)', text(op?.label)],
          ['결과 (operator.outcome)', text(op?.outcome)],
          [
            '모델 프로필',
            <>
              <code>{text(r.model_profile)}</code> · <NavLink to="/settings">Settings에서 보기</NavLink>
            </>,
          ],
        ]}
      />
      <p className="caption">
        프로그램 No.3/원복 종료 판정은 실제 물체 운반 성공과 다릅니다. 공개 입력군 A/B/C와 xArm 이상
        A121/B82/C182는 뜻이 다릅니다.
      </p>
    </Card>
  )
}

export function XarmStatusCards() {
  const { status, connection, error } = useApi()
  const { mode } = useSource()
  const live = mode === 'xarm-live'
  const latest = status?.latest ?? null
  const disconnected = connection === 'reconnecting' || connection === 'offline' || connection === 'closed'

  return (
    <section aria-label={live ? '현재 상태' : '최근 저장 기록'}>
      <h2>{live ? 'xArm 현재 상태' : 'xArm 최근 저장 기록'}</h2>
      {live ? (
        <Notice warning>
          mode=live는 서버가 로그 갱신을 관찰했다는 뜻입니다. 장비 안전·운전·운반 성공을 보증하지
          않으며, 서버 연결이나 heartbeat는 새 센서 샘플을 뜻하지 않습니다.
        </Notice>
      ) : (
        <Notice>저장된 기록입니다. 서버에 연결돼 있어도 로봇이 현재 운전 중이라는 뜻은 아닙니다.</Notice>
      )}
      {error && <AsyncState kind="error">{error}</AsyncState>}
      {disconnected && status && (
        <AsyncState kind="stale">연결이 끊겼습니다. 아래 숫자는 마지막으로 관측한 값입니다.</AsyncState>
      )}
      {!status && !error && <AsyncState kind="loading" />}
      {status && !latest && <AsyncState kind="no_data" />}
      {latest?.freshness.status === 'stale' && <AsyncState kind="stale" />}
      {latest?.freshness.status === 'historical' && (
        <Notice>원본이 더 이상 갱신되지 않는 과거 기록입니다.</Notice>
      )}
      {latest && (
        <div className="stack">
          <Cycle_ r={latest} live={live} />
          <Detection r={latest} />
          <Sensors r={latest} />
          <Quality r={latest} />
        </div>
      )}
    </section>
  )
}
