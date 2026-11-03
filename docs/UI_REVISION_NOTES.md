# MOmO UI 진행 체크리스트 · Revision 03

갱신일: 2026-11-03

## 근거와 변경 범위
- GitHub `docs/frontend-reference/00_먼저읽기.md`, 설정 JSON, CSV 스키마와 주요 분석 보고서를 기준으로 갱신했다.
- 근거 자료 커밋: `42c4929c7aa7b677d89e2593f8e6be7fc8c07e2c`.
- 기존 MEETING_NOTES_KO.md, MEETING_SUMMARY_KO.md, MOmO_MEETING_2026-10-16.pptx는 과거 근거다. 미팅 합의란이 비어 있다는 이전 기록을 확정 합의로 바꾸지 않는다.
- 문서 수정이며 프론트엔드/API 구현 완료를 의미하지 않는다.

## Revision 02에서 정정
- 완료 분석을 EDA·정상 Baseline만으로 한정하지 않는다. 특징 그룹 Ablation 72조건, 유형·Action 설명 분석, 지도학습 DT/RF 특징 중요도·선택 자료도 확보돼 있다.
- '개별 사이클 원본 결과 파일 없음'은 정정한다. `results_05_baselines/cycle_predictions.csv`가 있다. 다만 실제 수집 세션 History/API는 미확정이다.
- 전체 파일은 18모델×2122사이클=38196행이다. 단일 모델+split=evaluation은1174행(정상419+이상755)이다.

## 완료
- [x] 공유 자료의 주요 파일·설정·CSV 열 구조 확인 및 최신 문서 기준 반영.
- [x] category/anomaly는 평가용 실제 라벨, prediction은 정상/이상 판정으로 분리.
- [x] score는 모델별 점수이며 확률·미래 위험이 아님을 명시.
- [x] Baseline과 지도학습 특징 선택의 학습/분할/threshold 차이 구분.
- [x] API는 확정 계약이 아닌 제안임을 명시.

### 이전 Revision 02 완료 기록 · 이번 작업에서 재검증하지 않음
- [x] Dashboard / History / Settings 정적 디자인 3장 및 HTML 갱신 기록.
- [x] 실시간 연결됨, 유형 분류 확률, SHAP, 가상 감속·정지, 고정0.7/0.9 threshold, 5Hz 추론 표시 삭제 기록.
- [x] 대표 모델 지표·배치 FPR·EDA 수치 대조 및 정적 렌더링 각1페이지 확인 기록.
- 이번 작업에서는 해당 화면 파일을 다시 렌더링하지 않았다. 브라우저 동작/API 테스트도 수행하지 않았다.

## 진행 중 · 구현 상태 미검증
- [ ] 실제 프론트엔드 구조 확인 후 컴포넌트 적용.
- [ ] 공개 CSV/JSON 파싱·필터·페이지네이션 연결.
- [ ] 실제 장비 수집 세션 History 및 백엔드 계약 합의.

## 화면별 요구사항
### Dashboard
- [ ] 공개 Yu-Cobot 오프라인 결과와 실제 xArm 상태를 분리.
- [ ] 데이터 규모2122/정상1367/이상755와 출처 표시.
- [ ] model_comparison.csv 기본 scope=all_12; representation/input_set/algorithm 선택.
- [ ] auroc와 macro_category_auroc 구분; pr_auc_ap/Recall/normal_fpr/fp/n_normal 동시 표시.
- [ ] confusion matrix는 tn/fp/fn/tp 사용.
- [ ] category_metrics.csv의 반복 정상419를 유형 간 합산하지 않음.
- [ ] 정상 배치별 오탐·분모·불확실성 표시.

### History · 우선 공개 평가 목록
- [ ] cycle_predictions.csv에서 단일 모델+split=evaluation으로1174행 확인.
- [ ] 사이클 키 sample, 결과 키 sample+representation+input_set+algorithm 사용.
- [ ] category/anomaly와 모델 prediction을 시각적으로 구분.
- [ ] 학습/보정/평가 split을 혼합 집계하지 않음.
- [ ] 실제 장비 세션·시각이 없는 공개 자료에 가짜 session/timestamp를 생성하지 않음.

### Settings 및 분석 확장
- [ ] 우선 실험 설정 읽기 전용; 공개 threshold를 실장비에 복사하지 않음.
- [ ] 특징 그룹은 combination/algorithm/representation으로 비교.
- [ ] 특징 중요도는 protocol/algorithm/input_set 필터; 기본 참고 setting/random_forest/full.
- [ ] mean_importance와 std_importance/positive_folds/top10_folds를 함께 표시; MDI와 순열 AUROC 감소 분리.
- [ ] Top-K의 k는 숫자 문자열 또는 all; fold 평균과 pooled OOF 및 내부 선택 K 정책을 구분.
- [ ] aligned_timeseries.csv는 progress_percent/median/q10/q90로 표시; 실제 초·원시 History로 해석하지 않음.

## 파싱·오류 처리 · 필수 수정 기준
- [ ] UTF-8 BOM 처리; TRUE/FALSE는 명시적 boolean 변환. 문자열 존재 여부로 변환 금지.
- [ ] 빈 셀/NaN/비유한값을 정상·0점으로 처리하지 않음; JSON에서는 null.
- [ ] 로딩/빈 결과/파싱 오류/미평가/계산 대기/미연결 상태 분리.
- [ ] 모델별 score > threshold 의미 보존; 전역 고정 threshold 금지.
- [ ] 파일 스키마 및 필수 열·복합 키 검증.

## API 계약 제안 · 확정 아님
- 오프라인 조회 API의 경로·필터·응답·페이지네이션·오류는 Notion API 명세서 최신 초안에 정리했다. HTTP 서버 구현은 확인되지 않았다.
- 출처 source_kind/public_offline, dataset/source_file/source_revision을 제안한다. 원본에 없는 버전·장비 식별자를 만들어 넣지 않는다.
- 장비 API는 device/session/cycle/action, 모델·전처리·threshold 버전, 판정 시점, 센서 단위·주기·타임스탬프·동기화 품질을 별도 합의한다.
- 인증·권한·CORS·배포·캐시·지연 목표는 미합의다.

## 평가 조건·확인 필요
- Baseline: PRE_A 정상711학습/237보정, 평가 정상419+이상755. 목표 보정 FPR5%는 외부 배치 보장이 아니다.
- 지도학습 특징 선택: 정상·이상 학습, Cycle/setting 외부3fold, 내부 Balanced Accuracy threshold. Baseline과 직접 우열 비교하지 않는다.
- 지도 OOF 정상1367과 Baseline 평가 정상419를 혼합하지 않는다. fold 평균과 pooled 지표도 구분한다.
- RF full setting fold2에서 AUROC약0.609, 정상98/100 오탐 보고. 평균 성능만 강조하지 않는다.
- 공개 데이터 재사용에 따른 탐색적 결과이며 최종 독립 검증이 아니다.
- xArm API·실측 목표 FPR/Recall/지연·필수 센서·교수님 합의 범위는 미확인.
- xArm 5관절+그리퍼와 Yu-Cobot 6관절을 일대일 매핑하지 않는다.
- INA226 전체 공급 전류는 motor_iq 대체값이 아니다. 진동 효과·전압 차이의 인과·공통 표현/Adapter·장비 전이는 미검증.
- 유형 진단, 미래 K-cycle 위험, RUL, 실시간 조기 경보, 자동 감속/정지는 현재 완료 기능이 아니다.
- setting 순차 재생은 자연 마모나 미래 예측 검증이 아니다.

## 테스트 및 다음 작업
- [ ] CSV 어댑터 단위 테스트: boolean/null/BOM/필수 열/중복 키/정렬.
- [ ] 단일 모델 evaluation1174행, confusion matrix 합계, 필터 일관성 확인.
- [ ] 페이지네이션·파싱 결과 재사용 및 큰 CSV 처리 성능 검토.
- [ ] 실제 브라우저·HTTP API 통합 테스트. 이번 문서 작업에서는 미실행.
- [ ] 하드웨어 API·계측 확인 → 여러 세션 정상 수집 → 분포 비교 → 설정 고정 독립 평가 → 통합.

## 관련 문서
- [Notion 아이디어 기획서](https://www.notion.so/a554a4f5beaa82729e18011c9ce846f7)
- [Notion 요구사항 명세서](https://www.notion.so/e444a4f5beaa832dae0301286a7f4fc1)
- [Notion API 명세서](https://www.notion.so/e2e4a4f5beaa82ba9d5a01d42beef4c4)

## 기존 디자인 파일 기록
아래 이름은 Revision 02 기록을 보존한 것이며 이번 작업에서 파일 존재·렌더링을 재검증하지 않았다.
- dashboard_v2.png / dashboard_v2.html
- history_v2.png / history_v2.html
- settings_v2.png / settings_v2.html
