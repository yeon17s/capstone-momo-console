# MOmO 프론트 연결 가이드

이 서버는 기존 Pi 수집기가 남기는 파일을 읽어 조회용 SQLite와 HTTP/SSE로 제공한다. 웹 요청은 장치 조회·모델 추론·로봇 제어·임계값 변경을 실행하지 않는다. 현재 팀원 HTML 원본은 수정하지 않았다.

## 기존 화면을 보존하면서 연결하기

현재 `MOmO_UI/dashboard.html`, `history.html`, `settings.html`에는 공개 Yu-Cobot/voraus-AD 평가 스냅샷과 공통 UI 코드가 각각 내장돼 있다. `DB`는 이 공개 자료를 펼친 JavaScript 객체이며 서버 DB가 아니다. 공개 데이터 결과를 랜덤 mock으로 바꾸거나 xArm 실기 성능으로 이름만 바꾸지 않는다.

데이터 소스 탭을 분리한다.

| 화면 모드 | 데이터 | 표시 원칙 |
|---|---|---|
| 공개 평가 | 기존 `PAYLOAD`, `DB`, `CONFIG` | 공개 18구성·12유형·고정 커밋·분모 유지 |
| xArm 저장 이력 | `/api/v1/cycles`, 회차 상세·파형 | 저장 기록임을 표시. 서버가 연결됐어도 로봇이 현재 운전 중이라는 뜻은 아님 |
| xArm 현재 상태 | `/api/v1/status`, SSE | 응답의 `mode`, `freshness`, 센서 age/valid를 표시. 기록이 없으면 `no_data` |

`status.mode=live`도 서버가 실제 로그 갱신을 관찰했다는 뜻이다. 안전 상태·물체 운반 성공을 보증하지 않는다. 현행 모델 프로필은 Settings에서 읽기 전용으로 표시한다.

## 기존 DOM에 붙일 위치

| 기존 요소·함수 | xArm 모드 변경 |
|---|---|
| `#loadState` | HTTP/SSE 연결 상태와 실제 로그 freshness를 구분 표시 |
| `#representation`, `#input_set`, `#algorithm` | 공개 평가에서만 유지. xArm에서는 읽기 전용 모델 프로필 카드로 대체 |
| `#overview`, `#metrics` | 현재 회차·원 경보·센서 품질·발행/누락 수를 우선 표시. 실시간 정확도 생성 금지 |
| `#confusion`, `#categories`, `#batches` | `/metrics`에서 확인된 정답/미판정 분모를 함께 표시. 정답 미확인 회차를 정상으로 채우지 않음 |
| `#historyTable`, `#historyCount`, `#prev`, `#next` | `/cycles`의 `items/total/limit/offset`으로 서버 페이지 처리 |
| `#search`, `#truth`, `#prediction`, `#sort` | API 지원 필터에 맞게 재구성. 서버가 지원하지 않는 전체 검색·점수 정렬을 현재 페이지만 필터링한 뒤 전체 결과처럼 표시하지 않음 |
| `#download` | 같은 필터의 `/cycles.csv`; 현재 25행만 내보내지 않음 |
| `#comparePanel`, `#compareContent` | `/cycles/{id}`와 `/series`로 최대 두 회차 비교. API의 opaque ID를 그대로 사용 |
| `#experiment` | `/models`의 CB·GRU·보조 버전, 임계값, 5ms/650ms를 읽기 전용으로 표시 |
| `renderAnalysis()`의 Ablation/MDI/Top-K/OOF | 공개 연구 탭에 보존. 운영 화면의 장치 설정으로 연결하지 않음 |

기존 공개 입력군 A/B/C는 A=전류·전압, B=위치·속도·오차 추가, C=관절 iq 추가라는 공개 데이터 구성이다. xArm 이상 A121/B82/C182와 뜻이 다르다. 현재 xArm은 관절 iq·개별 전류·속도/추종오차·서보 온도를 수집하지 않는다.

## 클라이언트 사용

`frontend/momo-api.js`는 외부 라이브러리 없는 읽기 전용 클라이언트이다. 서버와 같은 출처에서 제공하면 CORS 설정이 필요 없다. 아래 코드는 실제 API 연결 예시이며 임의 센서 숫자나 정답을 생성하지 않는다.

```html
<script src="/frontend/momo-api.js"></script>
<script>
const { Client, alarmLabel, typeLabel, numberLabel } = window.MomoAPI;
const set = (id, value) => {
  const node = document.getElementById(id);
  if (node) node.textContent = value; // 로그 문자열은 innerHTML에 넣지 않음
};

function renderCurrent(status) {
  const record = status.latest;
  set('loadState', status.mode + ' · ' + status.server_time_utc);
  if (!record) {
    set('combinedAlarm', '데이터 없음');
    set('originalType', '미제공');
    set('auxiliaryType', '미제공');
    set('currentA', '—'); set('voltageV', '—'); set('qualityState', '데이터 없음');
    return;
  }
  const combined = record.detectors?.combined;
  set('combinedAlarm', alarmLabel(combined?.alarm));
  set('originalType', typeLabel(combined?.type));
  set('auxiliaryType', typeLabel(record.auxiliary?.estimated_type));
  set('qualityState', record.freshness.status + ' · 누락 ' + (record.quality?.missing_slots ?? '미제공'));
  set('currentA', numberLabel(record.sensors?.ina?.current_A) + ' A');
  set('voltageV', numberLabel(record.sensors?.ina?.voltage_V) + ' V');
  // combined.alarm=true + auxiliary.normal_like도 계속 경보로 표시한다.
  // operator.confirmed가 아니면 condition을 실제 정답으로 복사하지 않는다.
}

const api = new Client({
  baseURL: '', // 같은 출처 권장. 별도 개발 서버라면 http://xarm-pi:PORT
  onStatus: renderCurrent,
  onCycles: page => renderLiveHistory(page.items, page.total, page.limit, page.offset),
  onModels: data => renderReadOnlyModels(data),
  onConnection: state => set('apiConnection', state),
  onError: error => set('apiError', error.message)
});
api.start();
window.addEventListener('pagehide', () => api.stop());
// 공개 자료 모드로 전환할 때도 api.stop(); 기존 DB 기반 render()는 공개 모드에서만 실행.
</script>
```

`combinedAlarm`, `originalType`, `auxiliaryType`, `qualityState`, `currentA`, `voltageV`, `apiConnection`, `apiError`는 프론트 개발자가 새로 추가할 카드 ID다. `renderLiveHistory`와 `renderReadOnlyModels`도 팀 UI의 표/카드 함수로 구현해야 한다. 예제를 기존 HTML에 그대로 붙이는 것만으로 모든 카드가 생기지는 않는다. 기존 `badge(false)`는 “정상”을 표시하므로 실기에서는 `alarmLabel(false)`의 “미경보”로 바꾼다.

### History·필터·CSV

```js
// 정상 실제 라벨이 확인된 회차에서 경보한 결과. 표시 필터일 뿐 모델 정책은 변하지 않는다.
await api.setHistoryQuery({ confirmed: true, label: 'normal', alarm: true, limit: 25, offset: 0 });
// 다음 페이지: 같은 필터를 유지하고 offset만 증가.
await api.setHistoryQuery({ ...api.historyQuery, offset: 25 });
// 같은 필터 전체 CSV. 클라이언트가 limit/offset을 제거한다.
const exported = await api.csvInfo(); // HEAD로 행 수/상한 확인. 센서 조회·모델 실행 없음.
if (exported.truncated) throw new Error('CSV 상한 초과: 날짜/세션 필터를 나누어 주세요.');
const link = document.createElement('a');
link.href = exported.url; link.click();
// 상세 파형. 누락/잘림 구간을 선으로 이어 가짜 연속 파형을 만들지 않는다.
const detail = await api.cycle(cycleId);
const waves = await api.series(cycleId, { channels: ['ina', 'positions', 'forecasts', 'residuals'], limit: 2000 });
const trends = await api.trends({ run_id: detail.run_id, limit: 2000 });
// points의 statistics.available=false이면 회차 평균/RMS를 만들지 않고 미제공으로 표시.
```

History API는 UTC 수집시각 최신순이다. 지원 필터는 `label`, `condition`, `alarm`, `run_id`, `from_utc`, `to_utc`, `confirmed`, `model_profile`, `source_group`이다. 과거 `#truth`의 “실제 이상 전체”를 단일 `label` 값으로 대체할 수 없으므로 확인 여부와 실제 유형별 필터로 변경한다. 전역 자유검색·점수 정렬은 이번 API에 없다. 페이지 안에서만 제공한다면 그 범위를 명시한다. 날짜는 시간대가 포함된 ISO 8601을 전달한다.

지표도 필터된 집계다. History에서 경보 회차만 골랐다고 그 집합의 비율을 전체 FPR/Recall로 표시하지 않는다. 성능 카드는 평가 기간·세션·출처·모델 범위를 명시하고 실제 정답 확인/미판정 분모를 보여 준다.

CSV에는 페이지 제한을 적용하지 않지만 서버 상한이 있다. `csvInfo()`는 HEAD 응답의 `X-Export-Total`, `X-Export-Rows`, `X-Export-Truncated`를 확인한다. 상한을 넘기면 서버는200 응답으로 잘림을 명시하므로 프론트도 경고하고 날짜/세션 필터로 나눈다. 조용히 일부만 저장한 뒤 “전체”라고 표시하지 않는다. CSV의 실제 라벨과 모델 유형·보조 유형 열은 합치지 않는다. 조회 중 새 회차가 추가될 수 있으므로 HEAD/다운로드 사이를 고정 데이터베이스 snapshot으로 보장하는 기능은 아니다.

### 재접속·누락 처리

서버의 `event:status`는 전체 상태이며 cursor는 `<server_instance>:<seq>`다. 현재 센서·경보 카드는 수신 즉시 `onStatus`로 렌더링하며 History 타이머를 기다리지 않는다. 클라이언트는 EventSource의 자동 재연결을 사용한다. `reset`, 번호 gap, 서버 재시작, 재연결 시 status와 현재 필터의 History를 다시 조회한다. 센서 샘플/시각/동작 중 GRU 최대 점수만 바뀌면 History는 기본3초로 제한한다. 서버가 새회차·실행 phase·CB/OR 경보·추정 유형·실제 라벨 확인 변화를 전달하면 예약된 History 대기를 당겨 즉시 한 번 갱신한다. 모든 센서 SSE를 목록 조회5Hz로 확장하지 않는다. `stop()`은 SSE·polling·요청을 닫으며 로봇을 정지시키는 명령이 아니다.

SSE 스트림이 연결돼 있을 때5초 REST polling은 복구용 상태 재조회이며 현재 카드의 정상 갱신 주기가 아니다. EventSource를 지원하지 않는 환경에서는 이 polling 주기로 상태를 받는다. 상세 파형은 현재 회차를 '열기'로 요청한 저장 이력 스냅샷이며 자동으로200ms마다 다시 읽는 실시간 그래프가 아니다. 지연을 비교할 때 원시 센서 수신·수집기 파일 flush·서버 관찰·SSE 도착·브라우저 렌더·History 재조회 시각을 나눈다. 특히 관절2Hz 순차 응답이나 센서 결손을 웹 전송 지연으로 간주하지 않는다.

클라이언트가 서버 응답을 받았다는 사실은 센서가 새로 수신됐다는 뜻이 아니다. `freshness.status`, 센서의 `valid`, `quality`를 그대로 표시한다. 정확한 UTC anchor가 없어 센서 `age_s`는 null이며 `age_at_log_tail_s`는 같은 로그 끝까지의 시간차다. 이를 현재 센서 age로 표시하거나 이전 부팅 monotonic을 현재 부팅과 비교하지 않는다. SSE 연결 끊김 중 남겨 둔 숫자는 마지막 관측값이며 현재 실측이라고 표시하지 않는다.

파형 요청은 기본2000·최대5000행이며 시간/채널 필터를 먼저 적용한다. 보존/파싱 상한에 따른 `truncated`는 계속 확인한다. 추세 API는 기본500·최대2000회차다. CSV 다운로드 한 요청은 WAL snapshot으로 일관되게 읽지만 별도 HEAD와 다운로드가 동일 snapshot인 것은 아니다. 1.0.1에서는 새 폴더 발견 기본0.5초(최소0.2초), 새/활성 회차 우선, 완료 회차 sidecar5초, 오래된 이력 재점검60초다. 처리시간을 포함한 로그 관찰 목표200ms와 모델 발행·센서 취득 주기는 별개이며 보장값이 아니다. 고정 로그 재생으로 확인한 웹 지연을 실물 센서·로봇 동시 실행 성능으로 표현하지 않는다.

## 판단과 정답을 분리하기

| 필드 | 뜻 | 해서는 안 되는 변환 |
|---|---|---|
| `condition` | 계획된 수집 조건 | 실제 정답으로 자동 복사 |
| `detectors.combined.alarm` | true/false/null인 원 OR 경보 | null을 false로 변환, false를 모든 구간 정상 관측으로 해석 |
| `detectors.combined.type` | 기존 A/B/C 또는 unknown/no_alarm/unavailable | 보조 추정으로 덮어쓰기 |
| `auxiliary.estimated_type` | 기존 unknown에만 붙는 잠정 추정 | 확정 고장 원인, 실제 정답, 경보 취소로 사용 |
| `auxiliary.estimated_type=normal_like` | 원경보를 유지한 정상 유사 추정 | 정상 배지로 바꿔 원경보 숨기기 |
| `operator.confirmed`, `label`, `outcome` | 실제 관찰 확인 자료 | 위치 복귀 proxy·프로그램 완료에서 정답 추정 |
| `quality` | 결손·통신·발행 품질 | 품질 오류를 새로운 고장 유형으로 분류 |

`data_kind/source.scope`로 실제 No.3·정지 진단·저장 입력 재생을 구분한다. `model_profile=old_logistic_gru`는 과거 로지스틱/GRU 결과이며 현재 CatBoost 결과로 이름만 바꾸지 않는다. History 건수에는 동작0 사전검사도 포함할 수 있다. 지표에서는 `excluded_no_motion`을 따로 표시하고 기록 건수를 실제 운행 횟수로 부르지 않는다. `statistics`는 완전한 No.3 구간의 파싱 통계이며 없으면 마지막 센서값을 회차 평균/RMS로 대신하지 않는다.

CB 점수는 `1−P(normal)>0.60`, GRU는 표준화 잔차 임계 7.288925055167675와 직전5ms·650ms 내 서로 다른2회 초과다. CB는 회차 종료, GRU는 동작 중이다. OR 점수는 존재하지 않는다. 두 점수를 더하거나 평균하지 않는다. 보조 확률은 미교정 분류 확률이며 고장 확률/건전성 %/잔여 수명이 아니다. 실제 위치는 raw, 가속도는 g, INA 전류는 전체 공급 A이다.

## 팀원 확인 목록

- 공개 평가와 저장 이력/현재 상태가 명확히 구분되는가?
- `no_data`, `stale`, null 경보, 보조 unavailable이 초록색 정상으로 바뀌지 않는가?
- known 유형과 보조 추정·실제 확인 라벨이 별도 열인가?
- 원경보 true + normal_like에서도 경보가 남는가?
- 센서 age·위치 결손·예측 누락과 목표 200ms/실제 발행 간격을 보여 주는가?
- 필터/페이지/CSV/분모가 일치하고 새로고침·SSE 재접속 뒤 이력이 복원되는가?
- 모델/threshold는 읽기 전용이고 웹이 로봇을 움직이거나 모델을 재실행하지 않는가?
- 서보별 전류/온도, RUL, 건전성, AI 자동 비상정지를 완료 기능으로 표시하지 않는가?

클라이언트 자체 검증: `node hardware/xarm_web_server/frontend/test_momo_api.cjs`. 합성 전송 fixture만 사용하며 네트워크·장치·모델에 접근하지 않는다. 실제 서버 계약 검증은 배포 검증 기록과 `API_CONTRACT.md`를 함께 확인한다.
