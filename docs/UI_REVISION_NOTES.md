# MOmO UI 진행 체크리스트 · Revision 04 (API 연동)

갱신일: 2026-11-23

## 근거와 변경 범위
- 기준 문서: `docs/API_CONTRACT.md`(읽기 전용 HTTP/SSE API v1), `docs/FRONTEND_GUIDE_KO.md`, `docs/momo-api.js`, `docs/frontend-reference/00_먼저읽기.md`.
- Revision 03의 "API는 제안이며 HTTP 서버 구현은 확인되지 않았다"를 정정한다. 연결 대상은 `/api/v1`이며, 경로·필터·응답·SSE·CSV 상한은 `API_CONTRACT.md`가 기준이다.
- 기존 MEETING_NOTES_KO.md, MEETING_SUMMARY_KO.md, MOmO_MEETING_2026-10-16.pptx는 과거 근거다. 미팅 합의란이 비어 있다는 이전 기록을 확정 합의로 바꾸지 않는다.
- 이 문서는 진행 체크리스트이며 API 연동 구현 완료를 의미하지 않는다. 아래 체크 항목은 구현·검증 후에만 완료로 바꾼다.

## Revision 03 이후 변경
- 정적 HTML 3장(dashboard/history/setting)을 React + TypeScript 구조로 분리했다. 커밋 `d2ee9d6`이 API 연결 전 기준점이다.
  - `pages/`: dashboard, history, setting
  - `components/`: common, layout, charts, dashboard, history, settings
  - `context/`: 모델 선택, 비교 패널 / `hooks/`, `lib/`, `types/`
  - `data/payload.json`, `data/db.ts`: 공개 CSV 스냅샷. API 연결 후에도 공개 평가 모드의 데이터 소스로 유지한다.
- 라우팅은 `HashRouter`(`#/dashboard`, `#/history`, `#/settings`)다.
- 데이터 접근이 `data/db.ts`와 `lib/selectors.ts`에 모여 있어 API 클라이언트를 추가할 위치가 한정된다.

## 완료
- [x] 공유 자료의 주요 파일·설정·CSV 열 구조 확인.
- [x] category/anomaly는 평가용 실제 라벨, prediction은 정상/이상 판정으로 분리.
- [x] score는 모델별 점수이며 확률·미래 위험이 아님을 명시.
- [x] Baseline과 지도학습 특징 선택의 학습/분할/threshold 차이 구분.
- [x] 공개 평가 화면의 컴포넌트 분리(정적 데이터 기반).
- [x] API 계약·프론트 가이드·클라이언트(`momo-api.js`) 문서 확보.

### 이전 기록 · 이번 작업에서 재검증하지 않음
- [x] Revision 02: 실시간 연결됨, 유형 분류 확률, SHAP, 가상 감속·정지, 고정0.7/0.9 threshold, 5Hz 추론 표시 삭제 기록.
- [x] Revision 02: 대표 모델 지표·배치 FPR·EDA 수치 대조 기록.
- 브라우저 동작과 실제 서버 대상 통합 테스트는 수행하지 않았다.

## 데이터 소스 분리 (최우선 원칙)
화면에 데이터 소스를 구분해 표시하고 서로 섞지 않는다.

| 모드 | 데이터 | 표시 원칙 |
|---|---|---|
| 공개 평가 | `data/payload.json` (Yu-Cobot / voraus-AD) | 18구성·12유형·고정 커밋·분모 유지. xArm 성능으로 이름만 바꾸지 않는다 |
| xArm 저장 이력 | `/cycles`, `/cycles/{id}`, `/series`, `/metrics`, `/trends` | 저장 기록임을 표시. 서버 연결이 현재 운전 중임을 뜻하지 않음 |
| xArm 현재 상태 | `/status`, `/events`(SSE) | `mode`, `freshness`, 센서 `valid`·`quality`를 그대로 표시. 기록이 없으면 `no_data` |

- [ ] 헤더/출처 카드의 "API 미연결" 표기를 실제 연결 상태(connecting/connected/reconnecting/polling/offline)로 교체.
- [ ] 현재 `SourceSwitch`를 모드 전환 UI로 확장.
- [ ] `mode=live`는 로그 갱신 관찰이며 장비 안전·운전·운반 성공 보증이 아님을 표시.

## 연동 작업

### 공통 인프라
- [ ] `docs/momo-api.js`의 `Client`를 TypeScript 래퍼로 도입하거나 동일 동작으로 재구현 (`lib/api/`).
- [ ] 같은 출처 연결 기본. 별도 개발 서버는 서버의 CORS 허용 설정이 필요. Vite dev proxy로 `/api` 연결.
- [ ] 응답 타입 정의(`types/api.ts`): canonical 회차, status, models, metrics, trends, series.
- [ ] 전역 상태 Provider: `status`, 연결 상태, 오류. `start()`/`stop()`을 앱 생명주기에 연결(`pagehide`에서 `stop`).
- [ ] 4xx/5xx·네트워크 오류는 오류로 표시. `alarm=false`, 센서 0, 정상 라벨로 바꾸지 않는다.
- [ ] 로딩 / 빈 결과 / `no_data` / `stale` / 오류 / 미판정 상태를 분리한 공통 컴포넌트.
- [ ] 문자열은 `textContent`/JSX 텍스트로만 렌더링(로그 문자열을 HTML로 삽입하지 않음).

### Dashboard
- [ ] 현재 회차·원 경보(`detectors.combined`)·센서 품질·누락 수·freshness 카드. 서버 응답 기준.
- [ ] `alarm` 3상태(true / false / null)를 "이상 경보 / 미경보 / 미판정"으로 표시. null을 false로 변환 금지.
- [ ] `combined.type`(원 유형)과 `auxiliary.estimated_type`(보조 추정)을 별도 필드로 표시. 덮어쓰기 금지.
- [ ] `combined.alarm=true` + `normal_like`는 계속 경보로 표시.
- [ ] INA 전체 공급 전류(A)·전압(V)·가속도(g)·위치(raw)만 표시. 관절별 전류·토크·서보 온도로 바꾸지 않는다.
- [ ] `/metrics`: 확인된 실제 라벨 평가 범위의 정상 FPR·유형별 탐지율. `confirmed_total`, `confirmed_scored`, `confirmed_unavailable`, `normal_scored`, `anomaly_scored`, `pending_or_unclassified_truth`, `excluded_no_motion`을 함께 표시.
- [ ] 분모 0이면 비율은 null(미제공). 평가 라벨이 없는 상태에서 실시간 정확도·FPR을 만들지 않는다.
- [ ] 성능 카드에 평가 범위·날짜·세션·출처·모델 필터 명시. 경보 결과 필터 적용 시 조건부 집계임을 표시.
- [ ] 공개 평가 탭의 모델 선택(`representation/input_set/algorithm`)은 공개 모드에서만 유지. xArm 모드에서는 읽기 전용 모델 프로필 카드로 대체.
- [ ] 공개 입력군 A/B/C와 xArm 이상 A121/B82/C182는 뜻이 다름을 구분 표시.

### History
- [ ] 공개 평가 목록(현행 유지)과 xArm 저장 이력을 모드로 분리.
- [ ] `/cycles` 서버 페이지네이션: `items/total/limit/offset`, 기본 `limit=25`, 범위 1~250. UTC 수집시각 최신순.
- [ ] 지원 필터만 노출: `alarm`, `confirmed`, `label`, `condition`, `run_id`, `model_profile`, `source_group`, `from_utc`, `to_utc`. 시각은 시간대 포함 ISO 8601.
- [ ] 서버가 지원하지 않는 전체 검색·점수 정렬은 현재 페이지 안에서만 동작하며 그 범위를 명시. 현재 페이지만 거른 결과를 전체 결과처럼 표시하지 않는다.
- [ ] 기존 "실제 정상/이상" 필터는 `confirmed` + `label` 조합으로 재구성. 실제 이상 전체를 단일 `label` 값으로 대체하지 않는다.
- [ ] CSV 저장: `csvInfo()`(HEAD)로 `X-Export-Total/Rows/Truncated` 확인 후 `/cycles.csv`. 같은 필터 전체이며 현재 25행만 내보내지 않는다.
- [ ] 잘림(`X-Export-Truncated:true`) 시 경고하고 날짜/세션 필터로 나누도록 안내. 잘린 결과를 전체라고 표시하지 않는다. HEAD와 다운로드는 동일 snapshot이 아님을 안내.
- [ ] 비교 패널: `/cycles/{id}`와 `/series`로 최대 2개. ID는 목록의 opaque `id`를 URL 인코딩해서 사용.
- [ ] 실제 라벨(`operator.confirmed/label/outcome`), 계획 조건(`condition`), 모델 유형, 보조 유형을 별도 열로 표시. `condition`을 정답으로 복사하지 않는다.
- [ ] 동작 0 기록(`excluded_no_motion`)이 건수에 포함될 수 있으므로 기록 건수를 운행 횟수로 표시하지 않는다.
- [ ] `model_profile=old_logistic_gru` 과거 자료는 기록된 로지스틱/GRU 결과로 표시하고 현재 CatBoost 결과처럼 보이지 않게 한다.
- [ ] 상세 파형: 열기 시점의 저장 스냅샷이며 자동 갱신 그래프가 아님. 기본 `limit=2000`(최대 5000), `channels`, `from_s/to_s` 사용.
- [ ] `truncated`, `source_quality`(관측/보존 건수)를 확인하고 표시. 누락 구간을 선으로 이어 가짜 연속 파형을 만들지 않는다.
- [ ] `statistics.available=false`이면 평균/RMS를 마지막 센서값으로 채우지 않고 미제공으로 표시.
- [ ] `/trends`: 기본 `limit=500`(최대 2000). `points/total/limit/truncated` 표시.

### Settings
- [ ] 공개 평가 설정 읽기 전용 유지(현행).
- [ ] `/models`의 활성 프로필·CatBoost·GRU·보조 정책·임계값을 읽기 전용 카드로 표시.
- [ ] CB 임계 `1−P(normal) > 0.60`, GRU 표준화 잔차 임계 7.288925055167675 · 직전 5ms 허용 · 650ms 내 서로 다른 2회 초과. OR 합성 점수는 없으며 두 점수를 더하거나 평균하지 않는다.
- [ ] 공개 threshold를 실장비에 복사하지 않는다. 웹에서 모델·임계값 변경, 재추론, 로봇 명령, 라벨 변경 UI를 두지 않는다(mutation 요청 없음).
- [ ] 보조 확률은 미교정 분류 확률이며 고장 확률·건전성 %·잔여 수명이 아님을 표시.
- [ ] Ablation·MDI·Top-K·OOF는 공개 연구 탭에 보존하고 운영 설정으로 연결하지 않는다.
- [ ] `aligned_timeseries.csv`는 `progress_percent/median/q10/q90`로 표시. 실제 초·원시 History로 해석하지 않는다(상세 그래프 미구현).

### 실시간(SSE)·재접속
- [ ] `event:status`는 전체 `/status` 구조. 현재 카드는 수신 즉시 렌더링하고 History 타이머를 적용하지 않는다.
- [ ] cursor는 `<server_instance>:<seq>`. 숫자로 가정하지 않는다. gap / 서버 재시작 / rewind / `reset` / 재연결 시 status와 현재 필터의 History를 다시 조회.
- [ ] 일반 센서 갱신으로는 History를 기본 3초 간격으로 제한. 새 회차·phase·경보·유형·확인 라벨 변화는 즉시 갱신.
- [ ] SSE 연결 중 5초 REST polling은 복구용. EventSource 미지원 환경에서만 상태 갱신 주기로 사용.
- [ ] heartbeat·HTTP 응답 성공을 새 센서 샘플·로봇 정상으로 표시하지 않는다. SSE 끊김 중 숫자는 "마지막 관측값"으로 표시.
- [ ] 동시 SSE 최대 8클라이언트. 클라이언트 종료는 로봇 정지 명령이 아니다.

### 시각·단위 표시 규칙
- [ ] 센서 `monotonic_ns`를 `new Date(ns/1e6)`로 변환하지 않는다. 개별 센서 UTC를 만들지 않는다.
- [ ] 센서 `age_s`는 null. `age_at_log_tail_s`는 같은 로그 끝과의 차이이며 현재 센서 age로 표시하지 않는다.
- [ ] 위치 6개는 동시 측정이 아님(순차 조회). 단위는 A / V / W / g / raw.
- [ ] 명목 200ms와 실제 발행 간격·누락 수를 구분 표시. 관절 2Hz 순차 응답·센서 결손을 웹 전송 지연으로 해석하지 않는다.

## 파싱·오류 처리 · 필수 수정 기준
- [ ] 공개 CSV: UTF-8 BOM 처리, TRUE/FALSE는 명시적 boolean 변환. 문자열 존재 여부로 변환 금지.
- [ ] 빈 셀/NaN/비유한값을 정상·0점으로 처리하지 않음. JSON에서는 null.
- [ ] API: `alarm`은 JSON boolean 또는 null. `Boolean(value)` 등 truthiness 변환 금지.
- [ ] 알 수 없는 query/ID/잘못된 범위는 오류로 표시하고 정상 빈 데이터로 바꾸지 않는다.
- [ ] 모델별 `score > threshold` 의미 보존. 전역 고정 threshold 금지.
- [ ] 응답 스키마·필수 필드·`schema_version` 검증.

## 평가 조건·확인 필요
- Baseline: PRE_A 정상711학습/237보정, 평가 정상419+이상755. 목표 보정 FPR5%는 외부 배치 보장이 아니다.
- 지도학습 특징 선택: 정상·이상 학습, Cycle/setting 외부3fold, 내부 Balanced Accuracy threshold. Baseline과 직접 우열 비교하지 않는다.
- 지도 OOF 정상1367과 Baseline 평가 정상419를 혼합하지 않는다. fold 평균과 pooled 지표도 구분한다.
- RF full setting fold2에서 AUROC약0.609, 정상98/100 오탐 보고. 평균 성능만 강조하지 않는다.
- 공개 데이터 재사용에 따른 탐색적 결과이며 최종 독립 검증이 아니다.
- xArm 5관절+그리퍼와 Yu-Cobot 6관절을 일대일 매핑하지 않는다. 현재 xArm은 관절 iq·개별 전류·속도/추종오차·서보 온도를 수집하지 않는다.
- INA226 전체 공급 전류는 motor_iq 대체값이 아니다. 진동 효과·전압 차이의 인과·공통 표현/Adapter·장비 전이는 미검증.
- 프로그램 No.3/원복 종료 대리 판정은 실제 물체 운반 성공과 별개다.
- 유형 진단, 미래 K-cycle 위험, RUL, 실시간 조기 경보, 자동 감속/정지는 완료 기능이 아니다.
- 서보별 전류/온도, 건전성, AI 자동 비상정지를 완료 기능으로 표시하지 않는다.
- setting 순차 재생은 자연 마모나 미래 예측 검증이 아니다.
- 미합의: 인증·권한·TLS·배포·캐시, 실측 목표 FPR/Recall/지연, 교수님 합의 범위. 공개 인터넷·계정·원격 정지·재학습은 이번 API 범위가 아니다.

## 테스트 및 다음 작업
- [ ] API 클라이언트 단위 테스트(fixture): alarm 3상태, cursor 전이(next/gap/restart/rewind/duplicate), CSV 헤더 검증.
- [ ] 필터·페이지·CSV·분모 일치 확인. 새로고침·SSE 재접속 후 이력 복원.
- [ ] `no_data`, `stale`, null 경보, 보조 unavailable, 원경보 true + normal_like가 정상(초록)으로 바뀌지 않는지 확인.
- [ ] 단일 모델 evaluation 1174행, confusion matrix 합계, 필터 일관성(공개 평가).
- [ ] 실제 서버 대상 브라우저 통합 테스트. 고정 로그 재생 검증을 실센서·로봇 동시 성능으로 표현하지 않는다.
- [ ] 진행 순서 제안: API 클라이언트·타입 → Settings(`/models`) → Dashboard(`/status`, `/metrics`) → History(`/cycles`, CSV) → 상세 파형·비교 → SSE → `payload.json` 의존 정리(공개 모드는 유지).
- [ ] 하드웨어 API·계측 확인 → 여러 세션 정상 수집 → 분포 비교 → 설정 고정 독립 평가 → 통합.

## 관련 문서
- `docs/API_CONTRACT.md` · `docs/FRONTEND_GUIDE_KO.md` · `docs/momo-api.js`
- [Notion 아이디어 기획서](https://www.notion.so/a554a4f5beaa82729e18011c9ce846f7)
- [Notion 요구사항 명세서](https://www.notion.so/e444a4f5beaa832dae0301286a7f4fc1)
- [Notion API 명세서](https://www.notion.so/e2e4a4f5beaa82ba9d5a01d42beef4c4)
