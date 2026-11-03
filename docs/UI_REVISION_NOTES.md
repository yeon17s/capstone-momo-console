# MOmO UI 진행 체크리스트 · Revision 02

## 근거 문서
MEETING_NOTES_KO.md, MEETING_SUMMARY_KO.md, MOmO_MEETING_2026-10-16.pptx의 기재 현황을 반영했다. 미팅 합의란은 비어 있으므로 확정 결정으로 취급하지 않는다.

## 완료
- [x] Dashboard / History / Settings 정적 디자인 3장 및 HTML 갱신.
- [x] 현재 완료 성과를 공개 데이터 EDA·정상 기반 이상 탐지 Baseline으로 한정.
- [x] 실시간 연결됨, 유형 분류 확률, SHAP, 가상 감속·정지, 고정 0.7/0.9 임계값, 5Hz 추론 표시 삭제.
- [x] 보고된 대표 모델 지표·배치별 FPR·EDA 수치를 출처 문서와 대조.
- [x] 정상/이상 category는 평가 메타데이터이며 예측 유형과 구별.
- [x] Cycle 종료 및 완료 Action 집계 조건과 독립 검증 부재 표시.
- [x] 정적 렌더링 각 1페이지 생성 및 이미지 확인. 브라우저 동작/API 테스트는 수행하지 않음.

## 진행 중
- [ ] 실제 프론트엔드 코드 반영: 현재 산출물은 정적 화면 설계이며 동작 구현 아님.
- [ ] 개별 사이클 결과 및 수집 세션 이력 연결: 원본 결과 파일/API 없음.

## API 계약 제안 · 확정 아님
- 데이터 소스와 장비 식별자, session/cycle/action/setting.
- 모델·전처리·임계값 버전, raw_score, threshold, 정상/이상 판정, 판정 가능 시점.
- 센서별 단위·갱신 주기·타임스탬프, 누락 및 동기화 품질.
- 평가용 category는 추론 입력 및 예측 필드와 분리.
- 데이터 없음, 계산 대기, 누락, 연결 끊김은 정상 판정과 구별.

## 다음 작업
- [ ] 실제 코드 구조와 API 계약 확인 후 컴포넌트 적용.
- [ ] 결과 CSV/JSON 연동으로 현재 빈 판정 영역 활성화.
- [ ] 하드웨어 API·계측 확인 → 정상 반복 수집 → 분포 비교 → 독립 평가 → 통합.

## 확인 필요
- 실측 목표 FPR·Recall·지연, 필수 센서와 주기, 교수님 합의 범위.
- xArm 5관절+그리퍼와 Yu-Cobot 6관절을 일대일 매핑하지 않음.
- INA226 공급 전류는 motor_iq 대체값이 아님.
- 단순 setting 강도 순차 재생은 자연 마모·미래 예측 검증이 아님.
- 배치 전압 차이의 인과와 공통 표현/Adapter의 효과는 미검증.

## 디자인 파일
- dashboard_v2.png / dashboard_v2.html
- history_v2.png / history_v2.html
- settings_v2.png / settings_v2.html
