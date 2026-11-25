# MOmO Console

xArm 로봇의 **이상 탐지 결과를 읽기 전용으로 보여 주는 웹 콘솔**입니다. React + TypeScript + Vite로 만들었고, 서버의 `/api/v1`(HTTP/SSE)을 조회만 합니다. 이 화면에서 로봇을 움직이거나 모델·임계값·라벨을 바꾸는 기능은 없습니다.

> 현재 상태: 실제 서버를 붙인 통합 테스트는 아직 하지 못했습니다. 화면 동작은 단위·컴포넌트 테스트와 합성 데이터 stub 서버로만 확인했습니다. 자세한 진행 상황은 [`docs/UI_REVISION_NOTES.md`](docs/UI_REVISION_NOTES.md)를 보세요.

## 목차

1. [기능 개요](#1-기능-개요)
2. [대시보드](#2-대시보드)
3. [실행과 테스트](#3-실행과-테스트)
4. [명령어](#4-명령어)
5. [폴더 구조](#5-폴더-구조)
6. [참고 문서](#6-참고-문서)

---

## 1. 기능 개요

화면은 **Dashboard / History / Settings** 3개이고, 위쪽 "데이터 출처"에서 세 가지 모드를 고릅니다. 모드끼리 데이터를 섞어 보여 주지 않습니다.

| 모드 | 데이터 | 설명 |
|---|---|---|
| 공개 평가 스냅샷 | `src/data/payload.json` (Yu-Cobot / voraus-AD) | 서버 없이 동작합니다. 공개 데이터로 낸 평가 결과이며 xArm 성능이 아닙니다 |
| xArm 저장 이력 | `/cycles`, `/cycles/{id}`, `/series`, `/metrics`, `/trends` | 서버가 저장한 기록입니다. 서버에 연결됐다고 로봇이 지금 운전 중인 것은 아닙니다 |
| xArm 현재 상태 | `/status`, `/events`(SSE) | 서버가 로그 갱신을 관찰한 현재 상태입니다. 장비 안전·운전·운반 성공을 보증하지 않습니다 |

| 화면 | 공개 평가 모드 | xArm 모드 |
|---|---|---|
| Dashboard | 모델 성능, 혼동행렬, 유형별 Recall 등 | 현재(최근) 회차, 경보, 센서, 평가 지표 → [2장](#2-대시보드) |
| History | 평가 사이클 목록·필터·CSV 저장 | 서버 페이지네이션·필터, CSV 저장, 회차 상세 파형 비교(최대 2개), 추세 |
| Settings | 실험 설정, Ablation·특징 중요도, 정렬 시계열 | 활성 모델 프로필(`/models`)과 판정 정책 (읽기 전용) |

공통 원칙:

- `alarm`은 **이상 경보 / 미경보 / 미판정** 3상태입니다. 미판정(`null`)을 미경보로 바꾸지 않고, 미경보도 초록 "정상"으로 칠하지 않습니다.
- 데이터가 없거나(`no_data`), 갱신이 멈췄거나(`stale`), 서버 오류가 나면 정상 값이나 0으로 채우지 않고 그대로 표시합니다.
- 계획 조건(`condition`)은 정답이 아닙니다. 실제 확인 라벨(`operator.label`)과 별도로 표시합니다.

---

## 2. 대시보드

Dashboard는 모드에 따라 내용이 다릅니다.

### 2-1. xArm 모드

위에서 아래로 다음 순서입니다.

**상단 안내**
- 현재 상태 모드: "mode=live는 서버가 로그 갱신을 관찰했다는 뜻이며 장비 안전을 보증하지 않는다"는 안내.
- 저장 이력 모드: "저장된 기록이며 현재 운전 중이라는 뜻이 아니다"는 안내.
- 연결이 끊기면 "표시된 숫자는 마지막으로 관측한 값"이라는 경고가 뜹니다. `no_data`, `stale`(갱신 멈춤), 서버 오류도 각각 별도 안내로 표시합니다.

**현재 회차 카드**: 회차·phase·run, 데이터 freshness(상태와 age), 기록 시각(UTC). 아래 표에 계획 조건 / 실제 확인 여부 / 실제 라벨 / 결과 / 모델 프로필이 **별도 행**으로 나옵니다. 모델 프로필 옆의 링크로 Settings에서 정책을 볼 수 있습니다.

**경보와 유형 카드**
- 원 경보(CatBoost OR GRU): 이상 경보 / 미경보 / 미판정.
- 원 유형(`combined.type`)과 보조 추정(`auxiliary.estimated_type`)은 **서로 덮어쓰지 않고 따로** 표시합니다. 원 경보가 이상인데 보조 추정이 "정상 유사"여도 경보는 유지됩니다.
- CatBoost(회차 종료 시)와 GRU(동작 중)의 점수·임계값·경보를 각각 보여 줍니다. 두 점수를 합치거나 평균하지 않습니다(OR 합성 점수는 없음).
- 과거 `old_logistic_gru` 프로필 회차는 "현재 CatBoost 결과가 아님"을 붙여 따로 표시합니다.

**센서 카드**
- INA 전체 공급 전류(A)·전압(V)·전력(W), 가속도 x/y/z(g), 서보 1~6 위치(raw).
- 각 센서에 `valid` 배지를 붙입니다. 값이 없으면 0이 아니라 `—`입니다.
- 위치 6개는 순차 조회라 동시 측정이 아닙니다. 관절별 전류·토크·서보 온도는 수집하지 않으므로 표시하지 않습니다.

**수집 품질 카드**: 누락 슬롯 수, 위치 soft timeout 수, phase 품질, 오류.

**평가 지표 (`/metrics`)**
- 확인된 실제 라벨 기준의 분모 7종: `confirmed_total`, `confirmed_scored`, `confirmed_unavailable`, `normal_scored`, `anomaly_scored`, `pending_or_unclassified_truth`, `excluded_no_motion`.
- 정상 FPR·유형별 탐지율 등 나머지 응답은 표로 보여 줍니다. 분모가 0이면 비율은 0%가 아니라 `null`(미제공)입니다.
- 평가 범위 필터: 세션(run_id), 출처 그룹, 모델 프로필, 수집 기간, 경보 결과. 적용 범위를 문구로 보여 주고, 범위가 바뀌면 이전 범위의 숫자는 숨깁니다.
- 경보 결과로 거르면 **조건부 집계**라는 경고가 뜹니다. 그 집합의 비율은 전체 FPR·탐지율이 아닙니다.
- 라벨이 없는 상태에서 실시간 정확도나 FPR을 만들어 내지 않습니다.

현재 상태는 SSE로 즉시 갱신됩니다. 일반 센서 갱신만으로는 이력을 다시 읽지 않고, 새 회차·경보·확인 라벨 변화가 있을 때와 재연결·`reset` 때만 다시 읽습니다.

### 2-2. 공개 평가 모드

- 위쪽 도구 모음에서 평가 단위·입력 구성(A/B/C)·알고리즘을 고르면 해당 모델의 결과가 나옵니다.
- 지표 카드: 전체 AUROC, 유형 평균 AUROC, PR-AUC(AP), 이상 Recall, 정상 FPR 등.
- 시각 요약: 정상·이상 점수 분포(임계값 표시), 색상 혼동행렬, 유형별 Recall(낮은 탐지율 우선).
- 상세 표: 혼동행렬 수치, 정상 배치별 오탐/FPR/신뢰구간, 유형별 AUROC·AP·Recall.
- 공개 입력군 A/B/C와 xArm 이상 유형 A121/B82/C182는 **뜻이 다릅니다**. 공개 평가는 탐색적 사후 평가이며 최종 독립 검증이 아닙니다.

---

## 3. 실행과 테스트

### 3-0. 설치

```bash
npm install
```

최신 LTS Node를 권장합니다(개발은 Node 24에서 했습니다).

### 3-1. 공개 평가 모드 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173`을 엽니다. 기본이 공개 평가 모드라서 서버가 필요 없습니다.

### 3-2. stub 서버로 테스트

`/api/v1`을 흉내 내는 개발용 서버입니다. **데이터는 전부 합성이며 성능·정확도·실측의 근거가 아닙니다.** 터미널 2개가 필요합니다.

```bash
# 터미널 1: stub 서버 (기본 포트 8787)
npm run stub

# 터미널 2: 화면 (stub 으로 /api 프록시)
VITE_API_TARGET=http://localhost:8787 npm run dev
```

`.env` 파일에 `VITE_API_TARGET=http://localhost:8787`을 적어 두면 매번 입력하지 않아도 됩니다(`.env.example` 참고, `.env`는 커밋되지 않습니다).

브라우저에서 위쪽 "데이터 출처"의 **xArm 현재 상태** 또는 **xArm 저장 이력**을 누르면 연결됩니다. 헤더 배지에 연결 상태가 표시됩니다.

stub 환경변수:

| 변수 | 기본값 | 의미 |
|---|---|---|
| `STUB_PORT` | `8787` | 포트 |
| `STUB_MODE` | `live` | `live` / `history` / `no_data` |
| `STUB_TICK_MS` | `1000` | SSE status 이벤트 간격(ms) |
| `STUB_CSV_LIMIT` | `100000` | CSV 행 상한(작게 하면 잘림 확인 가능) |

#### 상황 재현

서버가 켜진 상태에서 터미널에서 실행합니다. 이 주소들은 테스트용이며 실제 API가 아닙니다.

```bash
curl 'localhost:8787/__stub/set?freshness=stale'     # 갱신 멈춤(stale) 상태
curl 'localhost:8787/__stub/set?mode=no_data'        # 기록 없음
curl 'localhost:8787/__stub/set?mode=history'        # 저장 기록 모드
curl 'localhost:8787/__stub/set?fail=cycles'         # /cycles 가 500 오류 (status|cycles|models|none)
curl 'localhost:8787/__stub/set?csv_limit=10'        # CSV 가 10행에서 잘림
curl 'localhost:8787/__stub/skip?n=5'                # SSE cursor gap 발생 → 화면이 다시 조회
curl 'localhost:8787/__stub/restart'                 # 서버 재시작 흉내 → 연결 끊김 후 reset
curl 'localhost:8787/__stub/drop'                    # SSE 연결만 끊기 → reconnecting 표시
curl 'localhost:8787/__stub/state'                   # 현재 stub 상태 확인
```

`set` 후에는 화면이 다음 갱신(최대 1초)에서 바뀝니다. 되돌리려면 `mode=live&freshness=&fail=none&csv_limit=100000`을 넘기세요.

#### 확인 체크리스트

| 확인할 것 | 방법 | 기대 결과 |
|---|---|---|
| 모드 전환 | 데이터 출처 카드를 번갈아 클릭 | 공개 평가 데이터가 xArm 화면에 섞이지 않음 |
| 연결 상태 | `drop` 실행 | `재연결 중` → `SSE 연결됨`, 끊긴 동안 "마지막 관측값" 안내 |
| 미판정 | History에서 원 경보 결과 = 미판정 | "미판정" 배지(미경보와 구분), 초록색 없음 |
| 보조 추정 | History에서 `정상 유사` 행 | 원 경보는 이상으로 유지 |
| 기록 없음 | `mode=no_data` | "기록된 데이터가 없습니다" 안내, 센서 숫자 없음 |
| 갱신 멈춤 | `freshness=stale` | stale 안내 |
| 서버 오류 | `fail=cycles` | 빈 목록이 아니라 오류 메시지 |
| 필터·페이지 | History 필터 변경, 다음 페이지 | 조건이 서버에 전달되고 첫 페이지로 돌아감 |
| CSV 잘림 | `csv_limit=10` → "CSV 준비" | "전체 이력이 아닙니다" 경고 |
| 상세·비교 | History 행의 "열기" (최대 2개) | 파형·추세 표시, 3번째는 안내만, 누락 구간은 선이 끊김 |
| 평가 범위 | Dashboard 필터에서 경보 결과 선택 | "조건부 집계" 경고, 범위가 바뀌는 동안 이전 숫자 숨김 |
| 서버 재시작 | `restart` | 재연결 후 `stub1` → `stub2` cursor로 이어지고 화면이 다시 조회 |

### 3-3. 실제 서버 연결

서버 주소를 개발 proxy 대상으로 지정합니다.

```bash
VITE_API_TARGET=http://<서버주소>:<포트> npm run dev
```

- 브라우저는 같은 출처(`localhost:5173`)로 `/api/v1`을 요청하고 Vite가 서버로 전달하므로 CORS 설정이 필요 없습니다.
- 서버와 화면을 다른 출처에서 직접 연결하려면 `VITE_API_BASE=http://host:port`를 쓰고, 서버에 CORS 허용이 있어야 합니다. 이때 `X-Export-Total`, `X-Export-Rows`, `X-Export-Truncated` 헤더가 노출(`Access-Control-Expose-Headers`)되지 않으면 CSV 준비 단계에서 오류가 납니다.
- 서버가 `/api/v1/events`(SSE)를 프록시 뒤에서도 버퍼링 없이 전달하는지 확인하세요. 버퍼링되면 현재 상태가 실시간으로 갱신되지 않습니다.

실서버로 처음 확인할 때 눈여겨볼 점은 다음과 같습니다(stub의 필드 이름은 실서버와 다를 수 있습니다).

- `/models`, `/metrics`의 비율 필드, `/series`의 채널 열, `/trends`의 시간 축은 응답 구조를 모르는 상태에서 "경로 · 값" 표나 열 선택으로 보여 주도록 만들었습니다. 실제 응답과 맞는지 확인한 뒤 구조화가 필요합니다.
- `/series`·`/trends` 행에 `t_s`가 없으면 해당 행은 그래프에서 빠집니다.
- SSE 이벤트에 `id`(`<instance>:<seq>`)가 없으면 이벤트마다 전체 재조회가 일어납니다.
- 동시 SSE는 서버 한도가 8개입니다. 초과 시 화면에서 구분 표시하지 못합니다.

### 3-4. 빌드 확인

```bash
npm run build      # 타입 검사 + 번들
npm run preview    # 빌드 결과 미리보기
```

같은 출처로 `/api/v1`을 제공하도록 서버나 리버스 프록시를 구성하는 것을 가정합니다. 라우팅은 `HashRouter`(`#/dashboard`, `#/history`, `#/settings`)라서 정적 파일 서버에 별도 rewrite 설정이 필요 없습니다. (배포·인증·TLS는 이번 범위가 아닙니다.)

### 3-5. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| xArm 모드에서 "서버에 연결할 수 없습니다" | stub/서버가 켜져 있는지, `VITE_API_TARGET` 주소·포트, 설정 후 `npm run dev`를 다시 시작했는지(환경변수는 시작 시에만 읽음) |
| proxy 오류(`ECONNREFUSED`) | 서버 포트가 맞는지. stub은 `npm run stub`이 켜진 터미널이 살아 있어야 함 |
| 헤더가 "연결 중"에서 안 바뀜 | 브라우저 개발자 도구 Network에서 `/api/v1/status`와 `/api/v1/events` 응답 확인 |
| CSV 준비에서 "행 수·상한 헤더를 읽을 수 없습니다" | 서버가 `X-Export-*` 헤더를 주는지, 별도 출처면 CORS 노출 헤더 설정 |
| 포트 8787이 사용 중 | `STUB_PORT=8788 npm run stub` 후 `VITE_API_TARGET`도 맞춰 변경 |
| 화면이 공개 데이터로만 보임 | 데이터 출처에서 xArm 모드를 선택했는지(기본은 공개 평가) |

---

## 4. 명령어

| 명령 | 설명 |
|---|---|
| `npm run dev` | 개발 서버 (기본 `http://localhost:5173`) |
| `npm run build` | 타입 검사 후 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | Oxlint |
| `npm test` | 전체 테스트(Vitest) |
| `npm run stub` | xArm API stub 서버 (합성 데이터) |

테스트 구성:

- `src/lib/api/*.test.ts`: API 클라이언트, 응답 검증, cursor·재접속, 오류 문구, 필터·파형 변환 (가짜 EventSource 사용).
- `scripts/stub-server/stub.test.ts`: stub 서버를 띄워 실제 HTTP/SSE로 클라이언트를 검증.
- `src/components/**`, `src/context/**`, `src/hooks/**`의 `*.test.tsx`: jsdom 컴포넌트 테스트(경보 3상태, no_data·stale, 필터·페이지, CSV 경고 등).
- `src/data/db.test.ts`: 공개 평가 스냅샷의 불변식(평가 1174행, 혼동행렬 합계, `score > threshold` 판정).

테스트의 fixture·stub 값은 API 문서의 필드 구조만 따르는 합성 값이며 실서버 검증을 대신하지 않습니다.

---

## 5. 폴더 구조

```
src/
  pages/           dashboard / history / setting (모드에 따라 공개용·xArm용 선택)
    public/        공개 평가 화면 (payload.json 에 의존, 지연 로딩)
  components/
    dashboard/     Dashboard 카드·표·차트, Xarm* = xArm 모드 화면
    history/       이력 표·필터·상세 비교
    settings/      설정·분석 카드
    layout/        헤더, 데이터 출처 전환, 푸터
    charts/        캔버스 차트
    common/        공통 UI (Card, Badge, AsyncState 등)
  context/         SourceContext(모드), ApiContext(연결·상태), 모델 선택, 비교
  hooks/           useMetrics, useCycleDetail 등
  lib/api/         읽기 전용 API 클라이언트·검증·변환 (GET/HEAD만 사용)
  data/            공개 평가 스냅샷(payload*.json, aligned.json)
  types/           공개 평가 타입, API 응답 타입(api.ts)
scripts/
  stub-server/     개발용 API stub + 통합 테스트
  split-payload.mjs, build-aligned.mjs   공개 데이터 변환 스크립트
docs/              API 계약, 프론트 가이드, UI 진행 체크리스트, 참고 자료
```

## 6. 참고 문서

- [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md): 읽기 전용 HTTP/SSE API v1 (경로, 필터, 필드 의미)
- [`docs/FRONTEND_GUIDE_KO.md`](docs/FRONTEND_GUIDE_KO.md): 프론트 연결 가이드
- [`docs/UI_REVISION_NOTES.md`](docs/UI_REVISION_NOTES.md): 진행 체크리스트, 검증 수준, 남은 작업
- [`docs/frontend-reference/`](docs/frontend-reference/): 공개 평가 원본 CSV·실험 설정
