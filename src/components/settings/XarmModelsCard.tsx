import { useApi } from '../../context/ApiContext'
import { flattenJson } from '../../lib/api/flatten'
import { AsyncState, Badge, Card, Notice, Table } from '../common'

/** `/models` 응답을 읽기 전용으로 표시한다. 필드 이름을 가정하지 않고 서버가 준 값을 그대로 펼친다. */
export function XarmModelsCard() {
  const { models, error } = useApi()

  return (
    <Card>
      <h3>
        활성 모델 프로필 <Badge tone="blue">/models · 읽기 전용</Badge>
      </h3>
      {!models && !error && <AsyncState kind="loading" />}
      {!models && error && (
        <AsyncState kind="error">모델 정보를 불러오지 못했습니다: {error}</AsyncState>
      )}
      {models && (
        <Table
          headers={['항목', '값']}
          rows={flattenJson(models).map((r) => [<code key="p">{r.path}</code>, r.value])}
        />
      )}
      <p className="caption">
        서버가 보고한 현재 활성 프로필입니다. 과거 회차(예: <code>old_logistic_gru</code>)에 소급
        적용하지 않습니다.
      </p>
    </Card>
  )
}

/** API 계약서(API_CONTRACT.md)에 명시된 판정 정책 설명. 값 자체는 위 /models 응답을 기준으로 본다. */
export function XarmPolicyNotes() {
  return (
    <Card>
      <h3>
        판정 정책 안내 <Badge tone="warn">API 계약서 기준</Badge>
      </h3>
      <ul>
        <li>
          CatBoost: <code>1−P(normal) &gt; 0.60</code>이면 경보이며, 회차 종료 시 판정합니다.
        </li>
        <li>
          GRU: 표준화 잔차 임계 <code>7.288925055167675</code> · 관절 목표 직전 5ms 허용 · 650ms
          이내 서로 다른 2회 초과이며, 동작 중 판정합니다. 650ms 확인 창은 센서 샘플링 주기나 화면
          갱신 주기가 아닙니다.
        </li>
        <li>
          최종 경보는 두 판정의 OR이며 <strong>OR 합성 점수는 없습니다.</strong> 두 점수를 더하거나
          평균하지 않습니다.
        </li>
        <li>
          보조 유형 확률은 미교정 분류 확률입니다. 고장 확률·건전성 %·잔여 수명이 아니며 원 경보와
          원 유형을 바꾸지 않습니다.
        </li>
        <li>공개 평가의 threshold를 실장비에 복사하지 않습니다.</li>
      </ul>
      <Notice warning style={{ marginTop: '14px', marginBottom: 0 }}>
        이 화면은 읽기 전용입니다. 웹에서 모델·임계값 변경, 재추론, 로봇 명령, 라벨 변경을 하지
        않습니다.
      </Notice>
    </Card>
  )
}
