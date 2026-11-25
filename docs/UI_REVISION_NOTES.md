# MOmO UI 진행 체크리스트 · Revision 04 (API 연동)

갱신일: 2026-11-25

## 구현 현황과 검증 수준 (2026-11-25)
- 구현: `lib/api/`(Client·검증·변환), `context/`(Source·Api), xArm 모드의 Dashboard / History(필터·CSV·상세·비교) / Settings. 공개 평가 화면은 `pages/public/`으로 분리하고 `payload.json`(약 3.5MB)을 별도 청크로 지연 로딩한다.
- 검증: `tsc -b`, 테스트 164건(Vitest: 단위·공개 스냅샷 불변식 + stub 서버 대상 HTTP/SSE 통합 13 + jsdom 컴포넌트 테스트), `vite build`. stub·fixture는 합성 데이터이며 실서버 검증이 아니다.
- 미검증: 실제 서버 대상 브라우저 통합 테스트, 응답 필드 구조(`/models`, `/metrics` 비율, `/series` 채널 값), SSE 8개 초과·실제 재접속. 아래 `[x]`는 구현과 단위 수준 검증을 뜻하며 실서버 검증 완료가 아니다.

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

- [x] 헤더/출처 카드의 "API 미연결" 표기를 실제 연결 상태(connecting/connected/reconnecting/polling/offline)로 교체.
- [x] 현재 `SourceSwitch`를 모드 전환 UI로 확장.
- [x] `mode=live`는 로그 갱신 관찰이며 장비 안전·운전·운반 성공 보증이 아님을 표시.

## 연동 작업

### 공통 인프라
- [x] `docs/momo-api.js`의 `Client`를 TypeScript 래퍼로 도입하거나 동일 동작으로 재구현 (`lib/api/`).
- [x] 같은 출처 연결 기본. 별도 개발 서버는 서버의 CORS 허용 설정이 필요. Vite dev proxy로 `/api` 연결. (`vite.config.ts`의 `VITE_API_TARGET` proxy, `.env.example`)
- [x] 응답 타입 정의(`types/api.ts`): canonical 회차, status, models, metrics, trends, series.
- [x] 전역 상태 Provider: `status`, 연결 상태, 오류. `start()`/`stop()`을 앱 생명주기에 연결(`pagehide`에서 `stop`).
- [x] 4xx/5xx·네트워크 오류는 오류로 표시. `alarm=false`, 센서 0, 정상 라벨로 바꾸지 않는다.
- [x] 로딩 / 빈 결과 / `no_data` / `stale` / 오류 / 미판정 상태를 분리한 공통 컴포넌트.
- [x] 문자열은 `textContent`/JSX 텍스트로만 렌더링(로그 문자열을 HTML로 삽입하지 않음). (`dangerouslySetInnerHTML`/`innerHTML` 사용 없음 확인)

### Dashboard
- [x] 현재 회차·원 경보(`detectors.combined`)·센서 품질·누락 수·freshness 카드. 서버 응답 기준.
- [x] `alarm` 3상태(true / false / null)를 "이상 경보 / 미경보 / 미판정"으로 표시. null을 false로 변환 금지.
- [x] `combined.type`(원 유형)과 `auxiliary.estimated_type`(보조 추정)을 별도 필드로 표시. 덮어쓰기 금지.
- [x] `combined.alarm=true` + `normal_like`는 계속 경보로 표시.
- [x] INA 전체 공급 전류(A)·전압(V)·가속도(g)·위치(raw)만 표시. 관절별 전류·토크·서보 온도로 바꾸지 않는다.
- [x] `/metrics`: 확인된 실제 라벨 평가 범위의 정상 FPR·유형별 탐지율. `confirmed_total`, `confirmed_scored`, `confirmed_unavailable`, `normal_scored`, `anomaly_scored`, `pending_or_unclassified_truth`, `excluded_no_motion`을 함께 표시. — 분모 7종은 카드, 비율 필드는 응답 구조 확인 전이라 경로·값 표로 표시.
- [x] 분모 0이면 비율은 null(미제공). 평가 라벨이 없는 상태에서 실시간 정확도·FPR을 만들지 않는다.
- [x] 성능 카드에 평가 범위·날짜·세션·출처·모델 필터 명시. 경보 결과 필터 적용 시 조건부 집계임을 표시. — `XarmMetricsFilters`로 세션·출처·모델 프로필·기간·경보 결과 필터를 `/metrics`에 전달하고 적용 범위를 문구로 표시. 범위가 바뀌면 이전 범위의 숫자를 숨김.
- [x] 공개 평가 탭의 모델 선택(`representation/input_set/algorithm`)은 공개 모드에서만 유지. xArm 모드에서는 읽기 전용 모델 프로필 카드로 대체. — 모델 프로필은 회차 카드와 Settings에 표시.
- [x] 공개 입력군 A/B/C와 xArm 이상 A121/B82/C182는 뜻이 다름을 구분 표시.

### History
- [x] 공개 평가 목록(현행 유지)과 xArm 저장 이력을 모드로 분리.
- [x] `/cycles` 서버 페이지네이션: `items/total/limit/offset`, 기본 `limit=25`, 범위 1~250. UTC 수집시각 최신순.
- [x] 지원 필터만 노출: `alarm`, `confirmed`, `label`, `condition`, `run_id`, `model_profile`, `source_group`, `from_utc`, `to_utc`. 시각은 시간대 포함 ISO 8601.
- [x] 서버가 지원하지 않는 전체 검색·점수 정렬은 현재 페이지 안에서만 동작하며 그 범위를 명시. 현재 페이지만 거른 결과를 전체 결과처럼 표시하지 않는다.
- [x] 기존 "실제 정상/이상" 필터는 `confirmed` + `label` 조합으로 재구성. 실제 이상 전체를 단일 `label` 값으로 대체하지 않는다.
- [x] CSV 저장: `csvInfo()`(HEAD)로 `X-Export-Total/Rows/Truncated` 확인 후 `/cycles.csv`. 같은 필터 전체이며 현재 25행만 내보내지 않는다.
- [x] 잘림(`X-Export-Truncated:true`) 시 경고하고 날짜/세션 필터로 나누도록 안내. 잘린 결과를 전체라고 표시하지 않는다. HEAD와 다운로드는 동일 snapshot이 아님을 안내.
- [x] 비교 패널: `/cycles/{id}`와 `/series`로 최대 2개. ID는 목록의 opaque `id`를 URL 인코딩해서 사용.
- [x] 실제 라벨(`operator.confirmed/label/outcome`), 계획 조건(`condition`), 모델 유형, 보조 유형을 별도 열로 표시. `condition`을 정답으로 복사하지 않는다.
- [x] 동작 0 기록(`excluded_no_motion`)이 건수에 포함될 수 있으므로 기록 건수를 운행 횟수로 표시하지 않는다.
- [x] `model_profile=old_logistic_gru` 과거 자료는 기록된 로지스틱/GRU 결과로 표시하고 현재 CatBoost 결과처럼 보이지 않게 한다.
- [x] 상세 파형: 열기 시점의 저장 스냅샷이며 자동 갱신 그래프가 아님. 기본 `limit=2000`(최대 5000), `channels`, `from_s/to_s` 사용. — 구간 입력 UI 추가(구간만 바꾸면 파형만 다시 조회).
- [x] `truncated`, `source_quality`(관측/보존 건수)를 확인하고 표시. 누락 구간을 선으로 이어 가짜 연속 파형을 만들지 않는다.
- [x] `statistics.available=false`이면 평균/RMS를 마지막 센서값으로 채우지 않고 미제공으로 표시.
- [x] `/trends`: 기본 `limit=500`(최대 2000). `points/total/limit/truncated` 표시.

### Settings
- [x] 공개 평가 설정 읽기 전용 유지(현행).
- [x] `/models`의 활성 프로필·CatBoost·GRU·보조 정책·임계값을 읽기 전용 카드로 표시. — 응답 필드명이 문서에 없어 경로·값 표로 표시. 실서버 응답 확인 후 구조화 필요.
- [x] CB 임계 `1−P(normal) > 0.60`, GRU 표준화 잔차 임계 7.288925055167675 · 직전 5ms 허용 · 650ms 내 서로 다른 2회 초과. OR 합성 점수는 없으며 두 점수를 더하거나 평균하지 않는다.
- [x] 공개 threshold를 실장비에 복사하지 않는다. 웹에서 모델·임계값 변경, 재추론, 로봇 명령, 라벨 변경 UI를 두지 않는다(mutation 요청 없음).
- [x] 보조 확률은 미교정 분류 확률이며 고장 확률·건전성 %·잔여 수명이 아님을 표시.
- [x] Ablation·MDI·Top-K·OOF는 공개 연구 탭에 보존하고 운영 설정으로 연결하지 않는다.
- [x] `aligned_timeseries.csv`는 `progress_percent/median/q10/q90`로 표시. 실제 초·원시 History로 해석하지 않는다. — 공개 Settings의 `AlignedTimeseriesCard`(`scripts/build-aligned.mjs`로 만든 `aligned.json`, 유효숫자 4자리 표시용 압축본, 카드에서 불러올 때만 로드). 원본 CSV 대비 값 검증은 첫 행 일치·분위수 순서·격자 검사까지이며 전체 대조는 아님.

### 실시간(SSE)·재접속
- [x] `event:status`는 전체 `/status` 구조. 현재 카드는 수신 즉시 렌더링하고 History 타이머를 적용하지 않는다.
- [x] cursor는 `<server_instance>:<seq>`. 숫자로 가정하지 않는다. gap / 서버 재시작 / rewind / `reset` / 재연결 시 status와 현재 필터의 History를 다시 조회.
- [x] 일반 센서 갱신으로는 History를 기본 3초 간격으로 제한. 새 회차·phase·경보·유형·확인 라벨 변화는 즉시 갱신. — `historyRevision` 지문 단위 테스트로 확인.
- [x] SSE 연결 중 5초 REST polling은 복구용. EventSource 미지원 환경에서만 상태 갱신 주기로 사용.
- [x] heartbeat·HTTP 응답 성공을 새 센서 샘플·로봇 정상으로 표시하지 않는다. SSE 끊김 중 숫자는 "마지막 관측값"으로 표시.
- [ ] 동시 SSE 최대 8클라이언트. 클라이언트 종료는 로봇 정지 명령이 아니다. — 8개 초과 시 서버 응답 방식을 몰라 화면 구분 미구현.

### 시각·단위 표시 규칙
- [x] 센서 `monotonic_ns`를 `new Date(ns/1e6)`로 변환하지 않는다. 개별 센서 UTC를 만들지 않는다.
- [x] 센서 `age_s`는 null. `age_at_log_tail_s`는 같은 로그 끝과의 차이이며 현재 센서 age로 표시하지 않는다.
- [x] 위치 6개는 동시 측정이 아님(순차 조회). 단위는 A / V / W / g / raw.
- [ ] 명목 200ms와 실제 발행 간격·누락 수를 구분 표시. 관절 2Hz 순차 응답·센서 결손을 웹 전송 지연으로 해석하지 않는다. — 누락 슬롯·위치 timeout 수만 표시. 실제 발행 간격 계산은 미구현.

## 파싱·오류 처리 · 필수 수정 기준
- [x] 공개 CSV: UTF-8 BOM 처리, TRUE/FALSE는 명시적 boolean 변환. 문자열 존재 여부로 변환 금지. — 앱에는 CSV 파서가 없고 `payload.json`은 이미 변환된 스냅샷이다. 결과물에서 `anomaly`·`prediction`이 boolean/null뿐임을 테스트로 확인했고(`data/db.test.ts`), 변환 단계(원본 CSV → payload) 자체는 이 저장소에서 재현·검증하지 않았다. 내보내기 CSV는 BOM·수식 인젝션 방지를 테스트.
- [x] 빈 셀/NaN/비유한값을 정상·0점으로 처리하지 않음. JSON에서는 null. — score·threshold는 유한 숫자 또는 null, 점수나 threshold가 없는 행에는 판정이 없음을 테스트. 내보내기 CSV에서 null은 빈 셀.
- [x] API: `alarm`은 JSON boolean 또는 null. `Boolean(value)` 등 truthiness 변환 금지.
- [x] 알 수 없는 query/ID/잘못된 범위는 오류로 표시하고 정상 빈 데이터로 바꾸지 않는다.
- [x] 모델별 `score > threshold` 의미 보존. 전역 고정 threshold 금지. — 판정이 있는 모든 행에서 `prediction === (score > threshold)`, 모델 구성마다 threshold 하나이고 구성 간 값이 다름을 테스트.
- [x] 응답 스키마·필수 필드·`schema_version` 검증. — `schema_version` 존재·`mode`·필수 필드 검증만 하며 특정 버전 고정은 하지 않음.

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
- [x] API 클라이언트 단위 테스트(fixture): alarm 3상태, cursor 전이(next/gap/restart/rewind/duplicate), CSV 헤더 검증.
- [ ] 필터·페이지·CSV·분모 일치 확인. 새로고침·SSE 재접속 후 이력 복원. — stub 서버·컴포넌트 테스트로 필터 쿼리·offset 초기화·CSV 잘림 경고·재조회까지 확인. 실서버 대상 확인과 브라우저 새로고침 복원은 미확인.
- [x] `no_data`, `stale`, null 경보, 보조 unavailable, 원경보 true + normal_like가 정상(초록)으로 바뀌지 않는지 확인. — 컴포넌트 테스트(`XarmStatusCards.test.tsx`, `XarmHistory.test.tsx`)로 확인. 화면 육안 확인은 별도.
- [x] 단일 모델 evaluation 1174행, confusion matrix 합계, 필터 일관성(공개 평가). — 18개 구성 모두 평가 1174행(정상 419 + 이상 755), 요약표 tn/fp/fn/tp가 행 단위 재계산과 일치, scope별 분모 일치를 테스트(`data/db.test.ts`).
- [ ] 실제 서버 대상 브라우저 통합 테스트. 고정 로그 재생 검증을 실센서·로봇 동시 성능으로 표현하지 않는다.
- [x] 진행 순서 제안: API 클라이언트·타입 → Settings(`/models`) → Dashboard(`/status`, `/metrics`) → History(`/cycles`, CSV) → 상세 파형·비교 → SSE → `payload.json` 의존 정리(공개 모드는 유지). (구현 순서대로 진행 완료. 실서버 검증은 별도)
- [ ] 하드웨어 API·계측 확인 → 여러 세션 정상 수집 → 분포 비교 → 설정 고정 독립 평가 → 통합.

## 서버 없이 가능한 남은 작업·테스트 (2026-11-25 기준)
서버 연동 테스트가 불가능한 동안 진행할 수 있는 항목이다. 임의 센서 숫자·정답을 만든 mock은 쓰지 않고, `API_CONTRACT.md`의 필드 구조만 따르는 fixture를 사용한다. fixture로 확인한 결과를 실서버·실장비 검증으로 표현하지 않는다.

### 수정·개선
- [x] 평가 범위 필터 연동: Dashboard `/metrics`에 날짜·세션(`run_id`)·출처·모델 필터를 붙이고, 경보 결과(`alarm`) 필터 적용 시 조건부 집계임을 표시. (Dashboard 미체크 항목)
- [x] 상세 파형 `from_s/to_s` 구간 입력 UI 추가(`/series` 지원 파라미터).
- [x] 공개 평가 모드 미확인 항목 점검: 공개 CSV BOM·TRUE/FALSE 변환, 빈 셀/NaN을 0점·정상으로 처리하지 않는지, 모델별 `score > threshold` 의미 보존. (파싱·오류 처리 미체크 항목, `data/db.ts`·`lib/selectors.ts` 대상)
- [x] 공개 평가 수치 점검: 단일 모델 evaluation 1174행, confusion matrix 합계, 필터 일관성. 단위 테스트로 고정 가능.
- [x] `ApiContext`의 `react(set-state-in-effect)` lint 경고 해소. — 모드별로 `key` 재마운트, `Client`는 렌더 중 생성·시작/종료만 effect. 이중 effect(StrictMode)에서 스트림이 중복 열리던 `Client.start()` 경합은 generation 검사로 수정.
- [x] 공개 평가 모드의 `payload.json`(약 3.5MB) 로딩 개선 검토(압축·분할). — Settings 전용 표(groups/importance/topk/oof, 약 0.95MB)를 `payload.research.json`으로 분리(`scripts/split-payload.mjs`, 원본과 값 동일 확인). Dashboard·History는 약 2.56MB만 로드.
- [x] `aligned_timeseries.csv`를 `progress_percent/median/q10/q90`로 표시하는 화면. 실제 초·원시 History로 해석하지 않음.
- [x] 오류 메시지 사용자 문구 정리: `API HTTP 422: /cycles`처럼 개발용 문구가 그대로 노출되던 것을 `ApiHttpError`/`ApiNetworkError`의 한국어 문구(+서버 `detail`)로 교체.

### 자동 테스트 보강
- [x] 컴포넌트 테스트 환경 도입(jsdom + Testing Library, devDependency 추가). 파일별 `// @vitest-environment jsdom`, 공용 헬퍼 `src/test/`.
- [x] 화면 불변식 테스트(fixture): 원경보 true + `normal_like`가 경보로 남는지, `alarm=null`이 "미판정"인지(미경보와 구분), `no_data`·`stale`·연결 끊김이 정상 값처럼 보이지 않는지, `valid=false` 표시.
- [x] `useMetrics`·`useCycleDetail`·`ApiProvider` 테스트: 모드 전환 시 `start/stop`, StrictMode 중복 시작 방지, 요청 취소(취소된 응답이 상태를 덮어쓰지 않음), `refreshCount` 재조회.
- [x] `XarmHistory`: 필터 변경 시 offset 0 복귀, 이전 필터 결과가 새 결과처럼 보이지 않는지, CSV 잘림 경고 문구, 현재 페이지 내 검색 범위 문구.
- [x] `SourceSwitch` 키보드 조작·`aria-pressed`, 차트 대체 텍스트 등 접근성 점검. — 키보드 조작·`aria-pressed`·차트 `role=img`+`aria-label`은 테스트/코드로 확인. 스크린리더 실사용·색 대비 점검은 미수행.

### 로컬 확인 (브라우저, 서버 없음)
- [ ] (브라우저 육안 확인, stub 서버 사용) `npm run dev`로 화면 점검: 서버가 없을 때 xArm 모드의 오류·로딩 표시, 공개 ↔ xArm 모드 전환 시 공개 데이터가 섞이지 않는지, 모바일 폭(900px 이하) 레이아웃.
- [x] 계약서 구조 fixture를 돌려주는 로컬 stub 서버(HTTP·SSE) 구현: `scripts/stub-server/`(`npm run stub`). 페이지네이션, 필터, CSV HEAD 헤더, SSE `status`/`reset`/gap/재접속/429, 오류 주입을 지원. stub 값은 동작 확인용이며 성능·정확도 근거로 쓰지 않는다.
  - 사용: `npm run stub` 후 `VITE_API_TARGET=http://localhost:8787 npm run dev`(`.env`에 설정해도 됨). 제어 URL: `/__stub/set?mode=live|history|no_data&freshness=stale&fail=status|cycles|models|none&csv_limit=N`, `/__stub/skip?n=5`(cursor gap), `/__stub/restart`(서버 재시작), `/__stub/drop`(SSE 끊기), `/__stub/state`.
  - 자동 확인(`scripts/stub-server/stub.test.ts`, 실제 HTTP/SSE 전송): 전체 회차 응답 검증 통과·alarm true/false/null 포함, opaque id(`:`·`/` 포함) 인코딩 왕복, 필터 적용, 잘못된 쿼리 422·없는 id 404·POST 405, CSV HEAD 잘림 헤더·BOM, `/metrics` 분모와 null 비율, `no_data`, 500 주입, SSE cursor gap·서버 재시작 reset·끊김/재연결·8개 초과 429, dev proxy 경유 `/api` 응답 확인.
  - 한계: 브라우저로 화면을 직접 보지는 못했다. 아래 "브라우저 육안 확인" 항목은 사람이 해야 한다.
- [ ] `npm run build` 산출물(`vite preview`)에서 `HashRouter` 경로와 `/api` 같은 출처 요청이 동작하는지(같은 출처 배포 가정).

### 이번 점검에서 찾아 고친 문제
- Dashboard 회차 카드의 "실제 확인 여부"가 `confirmed=false`일 때 "미확정" 대신 `false`로 표시되던 것(컴포넌트 테스트로 발견).
- `Client.start()`를 `start → stop → start`로 연달아 호출하면 EventSource가 중복 생성될 수 있던 경합(generation 검사 추가, 테스트 포함).
- SSE가 열려 있는데 REST 복구 조회 실패만으로 `offline`이 되거나, `offline`에서 복구되지 않던 문제.
- 평가 범위를 바꾼 직후 이전 범위의 `/metrics` 숫자가 새 범위 아래 남던 문제.

## 서버 연결 후 확인할 것 (현재 불가)
- [ ] 응답 필드 구조 확정 후 구조화: `/models`(활성 프로필·CatBoost·GRU·보조 정책 카드), `/metrics`(정상 FPR·유형별 탐지율 표·차트와 평가 범위 필드), `/series`(채널별 열 이름·단위·기본 프리셋), `/trends`(시간 축 필드).
- [ ] stub이 임의로 정한 필드 이름(`/metrics`의 `normal_false_alarm_rate`·`detection_by_label`, `/models` 구조, `/series` 열 이름, `/trends`의 `points` 항목)을 실서버 응답과 대조. stub 구조를 실서버 구조로 가정하지 않는다.
- [ ] `/series`·`/trends` 응답 행에 `t_s`가 항상 있는지 확인. 없으면 현재는 해당 행을 그리지 않고 건너뜀.
- [ ] SSE 이벤트에 `id`가 항상 오는지 확인. id가 없으면 `Client`가 이벤트마다 `invalid`로 보고 전체 재조회함.
- [ ] 동시 SSE 8개 초과 시 서버 응답·브라우저 동작 확인 후 안내 문구 추가. (stub은 429로 가정했을 뿐 실서버 동작이 아님)
- [ ] `HEAD /cycles.csv`의 `X-Export-*` 헤더, 별도 출처 개발 시 CORS 노출 헤더(`Access-Control-Expose-Headers`) 확인. 노출되지 않으면 `csvInfo()`가 "CSV export limits unavailable" 오류를 낸다.
- [ ] CSV 다운로드 링크: 별도 출처에서는 `download` 속성이 무시되므로 같은 출처 배포에서 동작 확인.
- [ ] 실서버 브라우저 통합 테스트(위 "테스트 및 다음 작업" 미체크 항목)와 실제 재접속(`Last-Event-ID`·서버 재시작 `reset`) 확인.
- [ ] 실제 발행 간격(명목 200ms 대비) 표시: `publication` 스트림·`source_quality` 필드 확인 후 구현.

## 관련 문서
- `docs/API_CONTRACT.md` · `docs/FRONTEND_GUIDE_KO.md` · `docs/momo-api.js`
- [Notion 아이디어 기획서](https://www.notion.so/a554a4f5beaa82729e18011c9ce846f7)
- [Notion 요구사항 명세서](https://www.notion.so/e444a4f5beaa832dae0301286a7f4fc1)
- [Notion API 명세서](https://www.notion.so/e2e4a4f5beaa82ba9d5a01d42beef4c4)
