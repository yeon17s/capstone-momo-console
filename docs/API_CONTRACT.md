# xArm 읽기 전용 HTTP/SSE API v1

프론트 연결 대상은 `/api/v1`이다. HTTP 서버는 기존 수집 파일의 조회용 인덱스를 제공한다. 웹 요청에 의한 센서/USB 조회, AI 재추론, 모델/임계값 변경, 로봇 명령, 실제 라벨 변경 endpoint는 없다. mutation method는 거부한다. 같은 출처 연결이 기본이며 별도 출처 개발은 서버의 명시적 CORS 허용 설정이 필요하다.

## 경로

| GET 경로 | 응답·의미 |
|---|---|
| `/health` | HTTP/인덱서 상태. 장비 안전/센서 정상/모델 정상 판정이 아님 |
| `/status` | `schema_version`, `server_time_utc`, `mode`, `latest`, `indexer`, `stream.cursor` |
| `/models` | 읽기 전용 활성 프로필·모델·탐지/보조 정책 |
| `/cycles` | `items`, `total`, `limit`, `offset`; UTC 수집시각 최신순 |
| `/cycles/{opaque_id}` | 해당 canonical 회차. ID는 목록의 `id`를 URL 인코딩해서 사용 |
| `/cycles/{opaque_id}/series` | 해당 회차 실측·예측·잔차·경보·발행 품질 시계열 |
| `/cycles.csv` | 같은 필터 전체 이력 CSV, 페이지 인자 제외. 서버 행 상한/잘림 헤더 적용 |
| `/metrics` | 확인된 실제 라벨이 있는 평가 범위의 정상 FPR·유형별 탐지율·분모 |
| `/trends` | 필터된 회차의 시간순 점수/통계 이력. 없는 회차 통계를 마지막 센서값으로 대체하지 않음 |
| `/events` | SSE `status`/`reset`; REST 상태를 대체하는 별도 모델 경보가 아님 |

`/cycles`의 기본 페이지는 `limit=25&offset=0`이며 limit은1~250이다. 필터는 아래와 같다. CSV와 metrics도 같은 필터 의미를 사용한다. CSV 기본 행 상한은100,000(설정으로 더 작게 제한 가능)이며 초과해도 HTTP200으로 `X-Export-Total`, `X-Export-Rows`, `X-Export-Truncated:true`를 반환한다. HEAD도 이 헤더를 제공한다. 프론트는 미리 확인하여 분할 조회를 안내하고 잘린 결과를 전체라고 표시하지 않는다.

| query | 값 |
|---|---|
| `alarm` | `true`, `false`, `null`(미판정). 생략하면 전체 |
| `confirmed` | `true`, `false`. 실제 관찰 확인 여부 |
| `label` | 확인 자료의 실제 유형. `normal`, `A121`, `B82`, `C182`, `D`, `E`, `F`, `foam_contact`, `station_disturbance` |
| `condition` | 계획된 조건. 실제 확인 label과 다를 수 있음 |
| `run_id`, `model_profile`, `source_group` | 목록 값과 정확히 일치하는 필터 |
| `from_utc`, `to_utc` | 시간대 포함 ISO8601 시각. 수집시각 범위 |

`series`는 `limit`(기본2000, 최대5000), `channels`(쉼표 구분 stream 이름), `from_s`, `to_s`(No.3 시작 기준 초)를 받는다. 채널·시간 필터를 응답 행 제한보다 먼저 적용한다. 다만 원본 파싱/메모리 보존 상한까지 없애는 것은 아니므로 `truncated`와 `source_quality`의 관측/보존 건수를 확인한다. 샘플 누락을 선으로 연결해 관측이 있었던 것처럼 표시하지 않는다. `trends`는 공통 필터와 `limit`(기본500, 최대2000)을 받고 `points/total/limit/truncated`를 반환한다. `statistics.available=false`이면 회차 평균/RMS가 없다는 뜻이며 마지막 센서값에서 만들어 채우지 않는다. 알 수 없는 query/ID/잘못된 범위는 오류이며 프론트에서 정상 빈 데이터로 바꾸지 않는다.

CSV 다운로드 한 요청은 WAL 읽기 snapshot으로 구성원을 고정한다. 이와 별개인 사전 HEAD 요청과 뒤의 다운로드 사이에 새 회차가 추가될 수 있으므로 둘이 동일 snapshot은 아니다. 1.0.1의 디렉터리 발견은 기본0.5초(`scan_seconds`, 최소0.2초)이며 새/활성 회차를 우선한다. 완료 회차 sidecar 확인은5초, 오래된 이력 재점검은60초다. 활성 로그 관찰 목표는 처리시간을 포함한 기본200ms(`poll_seconds`)다. 웹의 관찰 목표를 모델 발행·센서 취득 보장으로 해석하지 않는다.

## 상태와 canonical 회차

`status.mode`는 `live`, `history`, `no_data`다. 서버 연결 성공은 현재 장치 운전·로봇 안전의 증거가 아니다. 원본이 갱신되지 않은 값은 freshness와 함께 표시한다.

아래는 필드 구조 설명이며 임의 실측 숫자를 넣은 mock 결과가 아니다. 실제 필드 값/nullable 여부는 서버가 정규화한 응답을 사용한다.

| canonical 필드 | 의미 |
|---|---|
| `schema_version`, `id` | 응답 버전과 opaque 고유 회차 ID |
| `run_id`, `run_name`, `condition`, `source_group` | 원본 run과 계획된 조건/출처 |
| `data_kind`, `source.scope` | 실제 No.3/정지 진단/저장 입력 재생 등의 자료 종류와 원본 scope. 서로 다른 실험 근거를 합치지 않음 |
| `source.root`, `source.relative_path` | 허용된 로그 root와 그 아래 상대 경로. 임의 파일 읽기 경로가 아님 |
| `captured_utc`, `updated_utc` | 원본이 제공한 시각/출처에 따라 정규화한 기록 시각. 개별 센서 hardware 측정 UTC를 생성한 것이 아님 |
| `freshness.status`, `age_s`, `reason` | `active`, `stale`, `historical`, `no_data`와 데이터 age/설명 |
| `cycle.index`, `run_id`, `phase`, `start_ns`, `end_ns` | 회차·실행 구간·호스트 monotonic 시각 |
| `sensors.ina` | `current_A`, `voltage_V`, `power_W`, `valid`, `monotonic_ns` 등. INA 전체 전원 경로 값 |
| `sensors.adxl` | `x_g`, `y_g`, `z_g`, `valid`, `monotonic_ns` 등. 가속도에는 중력 성분 포함 |
| `sensors.positions['1'..'6']` | 각 서보의 `position_raw`, `monotonic_ns`, `valid` 등. 순차 조회 |
| `detectors.catboost` | CB4 `score`, `threshold`, `alarm`, 원래 모델 정보 |
| `detectors.gru` | GRU 잔차 `score`, `threshold`, 확인 경보 및 원래 모델 정보 |
| `detectors.combined` | 원 OR `alarm`, `type`. `score=null`, `threshold=null` |
| `auxiliary` | `estimated_type`, `estimate_status`, `tentative`, `probabilities` 등. 원래 유형/경보를 바꾸지 않음 |
| `quality` | `missing_slots`, `position_soft_timeouts`, `phase_quality` 등 |
| `operator.confirmed`, `label`, `outcome` | 실제 관찰 확인 자료. 없는 경우 미확정 |
| `model_profile` | 보존된 활성 모델 프로필 참조 |
| `statistics` | 완전하게 파싱한 No.3 `[start,end)` 구간의 전류/전압·가속도·평균 제거 진동 통계. preflight/원복 제외. 미완전하면 unavailable |

센서 시각은 PC/Pi monotonic 수신 시각이다. 같은 ADXL 배치 샘플의 수신 시각이 같을 수 있고, 6개 위치도 동시에 측정한 값이 아니다. monotonic ns를 Unix epoch처럼 `new Date(ns/1e6)`로 변환하면 안 된다. 원본에 없는 개별 센서 UTC를 만들지 않는다. 센서의 `source_time_utc`와 현재 시각까지의 `age_s`는 정확한 시계 anchor가 없어 null이다. `age_at_log_tail_s`는 같은 로그 마지막 시각과의 차이이며 현재 시각과의 차이가 아니다. summary의 최종 위치만 있으면 실제 개별 응답 시각도 null이다. 단위는 A/V/W/g/raw이며 각도·개별 모터 전류·토크·서보 온도 채널로 바꾸어 표시하지 않는다.

## 경보·유형·실제 정답

- `alarm`은 JSON boolean 또는 null이다. 문자열 truthiness나 `Boolean(value)`로 파싱하지 않는다.
- `combined.alarm`은 원 CatBoost4 `score>0.60` OR 고정 GRU 정책이다. CB는 회차 종료, GRU는 동작 중이다. OR 합성 점수는 없다.
- GRU 정책은 임계7.288925055167675·관절 목표 직전5ms 허용·650ms 이내 서로 다른2회 초과다. 확인 창을 센서 샘플링 주기 또는 UI 갱신 주기와 혼동하지 않는다.
- `combined.type`은 원래 `A121/B82/C182/unknown/no_alarm/unavailable`이다. 이를 `auxiliary.estimated_type`으로 덮어쓰지 않는다.
- unknown에만 붙는 보조 유형은 `normal_like/A121/B82/C182/D/E/F/foam_contact/station_disturbance`다. 실패는 unavailable이며 원경보를 보존한다.
- `normal_like`는 원경보를 유지한 정상 유사 설명이다. 9클래스 확률은 보정된 고장 확률·수명·건전성 %가 아니다.
- `condition`은 계획된 조건이다. `operator.confirmed`와 실제 `label` 확인 없이 정답으로 사용하지 않는다.
- 프로그램 No.3/원복 종료 대리 판정은 실제 물체 운반 성공과 별개다.
- 입력 결손은 품질 필드로 별도 보존한다. 모든 결손이 자동으로 OR=null이 되는 것은 아니므로 OR=false만으로 완전한 정상 관측이라고 표시하지 않는다.
- 과거 `model_profile=old_logistic_gru` 자료는 기록된 로지스틱/GRU 결과를 보존한다. `detectors.logistic`과 기록된 combined.logic을 읽고 현 CatBoost0.60 결과처럼 표시하지 않는다. 현재 `/models` 프로필을 모든 과거 회차에 소급 적용하지 않는다.

`metrics`는 동작0 기록을 `excluded_no_motion`으로 제외한 뒤, 확인된9종 실제 라벨 중 `alarm`이 있는 회차만 비율 분모로 사용한다. History의 기록 건수에는 동작0도 포함될 수 있으므로 운행 횟수로 표시하지 않는다. `confirmed_total`, `confirmed_scored`, `confirmed_unavailable`, `normal_scored`, `anomaly_scored`, `pending_or_unclassified_truth`를 함께 표시한다. 분모0이면 비율은 null이다. 평가 라벨이 없는 운영 상태에서 실시간 정확도·FPR를 생성하지 않는다. `alarm=true`처럼 예측 결과로 필터링한 지표는 전체 성능이 아니다. 성능 카드에는 평가 범위/날짜/세션/출처/모델 필터를 명시하고 경보 결과 필터가 적용되면 조건부 집계임을 표시한다.

## 시계열

응답은 `{cycle_id, series, limit, truncated, source_quality}`다. stream은 `ina`, `adxl`, `positions`, `forecasts`, `residuals`, `alarms`, `publication`이다.

- 실제 센서 행은 `monotonic_ns`, `t_s`와 채널 값을 보존한다.
- 위치 행은 `servo_id`, `position_raw`를 사용한다.
- 예측 행은 `issue_ns`, `t_s`, `targets`에 I_A/V_V/ID1_raw 등 원래 예측을 담는다.
- 잔차 행은 `available_ns`, `t_s`, `target`, `actual`, `forecast`, `score`, `alarm`을 보존한다.
- 발행/누락은 `publication`과 `source_quality`에서 확인한다. 명목200ms와 실제 발행 간격·누락 수는 별개다.

## SSE와 재조회

Content-Type은 `text/event-stream`이다. `event:status`의 data는 전체 `/status` 응답 구조이며 id는 `<server_instance>:<seq>`다. 단순 숫자·회차 번호로 가정하지 않는다. heartbeat는15초 간격 comment이므로 EventSource message 콜백을 발생시키지 않는다.

서버는 이벤트 재생 버퍼를 제공하지 않는다. `Last-Event-ID` gap/서버 재시작은 `event:reset`과 `{reason,cursor}`를 전달한 뒤 전체 status를 보낸다. 프론트는 reset·cursor gap·재연결 때 현재 상태와 필터된 History를 다시 읽는다. 과거 SSE가 모두 재전송됐다고 가정하지 않는다. 실제 이력의 근거는 REST/SQLite에 있다.

SSE를 받은 현재 카드의 렌더링에는 History3초 타이머를 적용하지 않는다. History는 일반 센서 갱신만 제한하고 서버가 관찰한 새회차/phase/경보/유형/확인 라벨 변화는 즉시 갱신한다. 원시 센서 취득 주기·로그 flush·서버 관찰·SSE 전송·목록 갱신은 서로 다른 주기다. HTTP 응답이 빠르거나 heartbeat가 왔다는 사실로 새 센서값이 보장되지 않는다. 서버는 cursor 변경을 조건으로 대기하므로 이미 바뀐 상태를 다음1초 timeout까지 일부러 기다리지 않는다. 고정 로그를 재생한 웹 지연 검증은 실제 센서·로봇을 함께 구동한 검증을 대신하지 않는다.

동시 SSE는 최대8클라이언트다. 일반 상태 조회와 연결 오류 처리는 필요하지만, SSE heartbeat를 새로운 센서 샘플·로봇 정상으로 표시하지 않는다. 클라이언트의 연결 종료는 로봇 정지 명령이 아니다.

## 오류·운영 범위

4xx/5xx는 API 오류로 표시하고 기존 값은 마지막 관측으로 남기거나 지운다. 예외를 삼켜 `alarm=false`, 센서0, 정상 라벨로 바꾸지 않는다. `no_data`는 신규 설치/로그가 없는 상태에서도 정상적인 응답 상태다.

기본 동일 출처의 조회 서비스다. CORS 허용은 인증을 대신하지 않는다. 공개 인터넷·사용자 계정/권한·TLS·메일/SMS 알림·원격 정지/재학습은 이번 읽기 전용 API의 범위가 아니다. 데이터 원본과 모델은 서버 조회 과정에서 변경하지 않는다.
