# voraus-AD 센서 구성별 이상 탐지 Baseline — 2026-10-15

## 평가의 지위와 목적

외부 전류/전압(A), 위치·속도·오차 추가(B), 관절 iq 추가(C)를 비교하여 xArm 계측·상태 수집 설계의 근거를 만든다. 모든 결과는 Yu-Cobot의 현재 상태 이상 탐지에 관한 **사후 참고 평가**다. 기존 EDA에서 평가 이상/정상 데이터를 열람했으므로 **최종 독립 검증 성능은 아직 없다**. 새로운 xArm 데이터 또는 분석에 노출되지 않은 별도 데이터로 고정 파이프라인을 평가해야 한다. 다른 로봇 전이, 조기 탐지, 미래 K-cycle 위험도, RUL 성능을 주장하지 않는다.

## 고정 프로토콜

- 100Hz 원본 2,122사이클. PRE_A 정상 948만 내부에서 seed=20261015로 75:25 무작위 분할: 학습 711, 정상 검증 237. 평가: 정상 419(73=319, 74=37, 75=44, 76=19) + 이상 755, 총 1,174. cycle_split.csv에 모든 sample 배정을 저장했다.
- 공식 바깥 분할을 유지했지만 학습을 948 전부로 하지 않고 711+검증 237로 나눴다. 논문 모델/전처리/입력/학습 절차의 재현 실험이 아니므로 논문 수치와 직접 우열 비교하지 않는다.
- StandardScaler와 상수 특징 제거(학습 분산 <= 1e-12)는 학습 정상만으로 fit. 검증 정상은 threshold만 결정하며 모델을 재학습하지 않는다. 평가 라벨/setting은 metric·그룹 분석에만 사용한다.
- 임계값은 목표 검증 FPR 5%, 정상 검증 점수의 split-conformal 상위 순서통계량: k=ceil((237+1)*0.95)=227번째 값. score > threshold일 때 이상. 테스트에서 F1/Recall을 보고 threshold를 고르지 않았다. 배치 이동·사이클 상관 때문에 이 명목 FPR이 외부 정상에서 보장되는 것은 아니다.
- Baseline: 통계 점수=표준화 특징 z의 제곱 평균, Isolation Forest=200 trees/max_samples=256/contamination=auto, PCA=학습 설명분산 95%를 남긴 뒤 재구성 MSE. IF 점수 부호는 큰 값이 이상이 되도록 통일. 모델·입력·Action 선택 및 집계 규칙을 평가 전에 고정했다.
- 주 지표는 유형별(각 category vs 동일한 정상 419개) AUROC의 12종 macro 평균. 논문 V-A의 권고를 따른다. 전체 pooled AUROC는 유형별 샘플 수에 영향받아 보조로만 본다. PR-AUC는 Average Precision(AP)을 주 표에 표시했고, 사다리꼴 PR 곡선 적분도 model_comparison.csv의 pr_auc_trapezoid로 별도 저장했다. 평가 이상 비율은 755/1174≈64.3%이며 실제 운영 Precision을 그대로 예측하지 않는다.

## 입력과 계산 시점

| 입력 | 원신호 | 명목 특징 수 | 실제 적용 의미 |
| --- | --- | --- | --- |
| A | robot_current, robot_voltage | 16 | INA226 계측 후보. Yu-Cobot 신호와 실제 센서의 주기·대역폭·노이즈는 다름 |
| B | A + 6관절 target/joint position/velocity + 위치/속도 오차 | 304 | xArm 목표/피드백 API·속도 산출 주기 확인 필요. 산업용 6축과 5관절+그리퍼를 직접 대응하지 않음 |
| C | B + motor_iq 6개 | 352 | Yu-Cobot 추가 센서의 참고 효과. xArm 필수 입력으로 확정하지 않음 |

각 신호에서 평균·표준편차·RMS·절대 피크·절대값 평균·절대값 P95·시간 미분 절대값 평균/P95를 계산했다. 오차=목표-실제. A⊂B⊂C로 포함관계를 유지하고 이상 대상 관절을 골라주지 않았다. 전체 DC 전류와 iq를 합산/치환하지 않는다. 제외한 상수 특징 수와 PCA 차원은 model_fit_audit.csv에서 확인한다.

전체 사이클 실험은 종료 후 요약 특징을 계산한다. Action 실험은 공식 7개 active 동작(1,3,5,7,9,11,13)별 모델을 두고, 연속 action+active 구간마다 요약한다. 학습 정상 점수의 중앙값/IQR로 각 Action 점수를 맞춘 뒤 관측 완료 구간의 최대값을 사이클 점수로 쓴다. 검증에서도 같은 최대값으로 threshold를 결정해 Action별 다중 경보를 사이클 단위로 보정한다. 반복 방문도 같은 사이클 split에 남는다.

action/active는 구간 경계와 모델 라우팅에 쓰는 외부 작업 상태이며 숫자 특징은 아니다. 실제 운용에서 이를 실시간으로 제공해야 한다는 조건부 실험이다. 각 구간의 미분에는 구간 내부 샘플만 쓰고, 다음 구간의 센서값·전체 사이클 길이·진행률·종료 여부는 특징에 넣지 않는다. 구간 종료를 알려주는 실시간 상태 신호는 필요하다. 두 실험의 비교는 단계 분리+정상화+최댓값 집계 전체의 효과이며 순수 시간 정렬만의 효과는 아니다. 이번 평가는 모두 최종 사이클 판정이며 조기 탐지 지연을 평가하지 않는다.

누락 Action을 미래에서 알아내 벌점으로 넣지 않는다. 관측된 완료 구간만 집계했고, 사용 가능한 active 구간이 전혀 없는 사이클은 묵살하지 않고 오류를 내도록 했다. 실제 누락 active Action이 있는 사이클은 0개다.

## 전체 이상 12종 결과

값은 0~1이며 macro는 12종 동일 비중 평균, auroc는 pooled 참고 지표다.

| representation | input_set | algorithm | macro_category_auroc | auroc | pr_auc_ap | precision | recall | f1 | normal_fpr |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cycle | A | statistical | 0.797 | 0.848 | 0.904 | 0.884 | 0.637 | 0.741 | 0.150 |
| cycle | A | isolation_forest | 0.794 | 0.834 | 0.892 | 0.906 | 0.409 | 0.564 | 0.076 |
| cycle | A | pca | 0.637 | 0.666 | 0.796 | 0.873 | 0.228 | 0.361 | 0.060 |
| cycle | B | statistical | 0.677 | 0.644 | 0.765 | 0.820 | 0.248 | 0.380 | 0.098 |
| cycle | B | isolation_forest | 0.632 | 0.592 | 0.722 | 0.753 | 0.158 | 0.261 | 0.093 |
| cycle | B | pca | 0.824 | 0.772 | 0.857 | 0.932 | 0.344 | 0.503 | 0.045 |
| cycle | C | statistical | 0.713 | 0.709 | 0.826 | 0.847 | 0.426 | 0.567 | 0.138 |
| cycle | C | isolation_forest | 0.661 | 0.641 | 0.752 | 0.780 | 0.249 | 0.378 | 0.126 |
| cycle | C | pca | 0.899 | 0.884 | 0.930 | 0.895 | 0.735 | 0.807 | 0.155 |
| action | A | statistical | 0.770 | 0.826 | 0.884 | 0.877 | 0.621 | 0.727 | 0.158 |
| action | A | isolation_forest | 0.776 | 0.828 | 0.883 | 0.920 | 0.396 | 0.554 | 0.062 |
| action | A | pca | 0.603 | 0.627 | 0.742 | 0.778 | 0.297 | 0.430 | 0.153 |
| action | B | statistical | 0.749 | 0.735 | 0.823 | 0.909 | 0.212 | 0.344 | 0.038 |
| action | B | isolation_forest | 0.700 | 0.677 | 0.765 | 0.807 | 0.117 | 0.204 | 0.050 |
| action | B | pca | 0.865 | 0.805 | 0.866 | 0.875 | 0.351 | 0.501 | 0.091 |
| action | C | statistical | 0.758 | 0.786 | 0.862 | 0.861 | 0.452 | 0.593 | 0.131 |
| action | C | isolation_forest | 0.701 | 0.689 | 0.773 | 0.826 | 0.132 | 0.228 | 0.050 |
| action | C | pca | 0.909 | 0.880 | 0.918 | 0.942 | 0.472 | 0.628 | 0.053 |

## 핵심 결과 해석

1. **전체 전류·전압만으로 일부 이상 구분은 가능하지만 오탐이 문제다.** A/전체사이클/통계 점수는 12종 macro AUROC 0.797, 전체 Recall 0.637, 정상 FPR 15.0%였다. 마찰 AUROC는 0.977였지만 정상 배치74/75 FPR은 각각 67.6%/65.9%였다. 배치가 다른 정상까지 안정적으로 받아들였다고 볼 수 없다.
2. **위치·속도 추가 효과는 알고리즘별로 다르다.** 전체사이클 PCA의 macro AUROC는 A 0.637 → B 0.824로 증가했지만 통계 점수와 IF에서는 하락했다. B가 반드시 나쁘다는 결론이 아니라, 현재의 고차원 요약/동일 가중 점수가 추가 정보를 잘 활용하지 못할 수 있다는 결과다. 특히 마찰/하중의 개별 성능은 전체12종 평균과 다르게 움직인다.
3. **iq 정보는 PCA에서 참고 성능을 높였다.** 전체사이클 PCA의 B→C macro AUROC는 0.824→0.899였으나 C의 FPR은 15.5%였다. 높은 순위 구분력만으로 운영 임계값이 적합하다고 판단할 수 없다.
4. **Action 정보는 마찰 탐지의 일관된 개선을 보이지 않았다.** C/PCA의 macro AUROC는 전체사이클 0.899→Action 0.909로 소폭 증가했지만 마찰 AUROC는 0.910→0.851, 마찰 Recall은 0.799→0.319로 감소했다. A/IF의 마찰 등 일부 조합에서는 좋아져, 구간 정보 자체의 보편적 이득으로 정리할 수 없다.
5. **정상 배치별 평가가 필수다.** 전체 평균 FPR 하나로 작은 배치의 큰 오탐을 숨길 수 있다. xArm에서는 단일 날짜의 정상 검증만으로 threshold를 고정하기 전에 여러 세션의 정상 변동을 확보해야 한다.

### A 통계 점수의 특징 기여 확인

아래 값은 각 집단에서 학습 정상 기준 z²의 평균이다. 전체 통계 점수는 유지된 모든 열의 z² 평균이며, 이 표는 그 구성요소를 설명한다.

| feature | fit_normal | friction | weight | normal73 | normal74 | normal75 | normal76 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| robot_voltage__abs_mean | 1.000 | 17.450 | 2.633 | 0.170 | 9.804 | 0.156 | 1.601 |
| robot_voltage__mean | 1.000 | 17.450 | 2.633 | 0.170 | 9.804 | 0.156 | 1.601 |
| robot_voltage__rms | 1.000 | 17.449 | 2.633 | 0.170 | 9.804 | 0.156 | 1.601 |
| robot_voltage__abs_p95 | 1.000 | 7.999 | 0.167 | 0.167 | 0.167 | 0.167 | 0.167 |
| robot_voltage__peak_abs | 1.000 | 2.168 | 0.750 | 0.847 | 1.165 | 0.626 | 0.605 |
| robot_voltage__rate_abs_mean | 1.000 | 1.598 | 1.850 | 0.704 | 0.683 | 0.795 | 2.329 |

마찰 집단의 큰 기여는 전압 평균·절대평균·RMS 쪽에서 나타났다. 따라서 A의 높은 마찰 AUROC를 **마찰로 인한 전체 전류 증가를 포착했다는 증거**로 쓰면 안 된다. 전압 차이가 물리적 이상에 의한 것인지 수집 배치·전원 상태 등의 차이인지는 이번 실험으로 분리할 수 없다. 이는 모델 점수 설명이며 물리적 원인 규명이 아니다. 이 관찰을 근거로 전압 특징을 제거하거나 threshold를 재조정하지 않았다.

양수 신호의 mean/abs_mean과 거의 같은 RMS 등 중복 특징은 통계 점수에서 해당 정보를 반복 가중한다. B/C의 다수 위치·속도 요약도 차원과 상관구조를 바꾸므로 입력 추가의 이득이 모든 Baseline에서 같지 않다. 공정하게 같은 통계 정의를 유지했지만, 이 실험이 각 센서 구성의 최적 가능 성능을 나타내는 것은 아니다.

## 마찰·추가 하중 결과

| representation | input_set | algorithm | auroc_category0 | auroc_category1 | recall_category0 | recall_category1 |
| --- | --- | --- | --- | --- | --- | --- |
| action | A | isolation_forest | 0.930 | 0.857 | 0.562 | 0.429 |
| action | A | pca | 0.839 | 0.543 | 0.569 | 0.154 |
| action | A | statistical | 0.960 | 0.849 | 1.000 | 0.628 |
| action | B | isolation_forest | 0.674 | 0.651 | 0.139 | 0.064 |
| action | B | pca | 0.749 | 0.680 | 0.097 | 0.083 |
| action | B | statistical | 0.744 | 0.669 | 0.146 | 0.115 |
| action | C | isolation_forest | 0.676 | 0.716 | 0.160 | 0.090 |
| action | C | pca | 0.851 | 0.822 | 0.319 | 0.288 |
| action | C | statistical | 0.760 | 0.836 | 0.375 | 0.468 |
| cycle | A | isolation_forest | 0.886 | 0.901 | 0.368 | 0.628 |
| cycle | A | pca | 0.860 | 0.524 | 0.500 | 0.058 |
| cycle | A | statistical | 0.977 | 0.872 | 1.000 | 0.667 |
| cycle | B | isolation_forest | 0.570 | 0.591 | 0.139 | 0.135 |
| cycle | B | pca | 0.805 | 0.654 | 0.361 | 0.199 |
| cycle | B | statistical | 0.650 | 0.620 | 0.236 | 0.224 |
| cycle | C | isolation_forest | 0.619 | 0.715 | 0.194 | 0.282 |
| cycle | C | pca | 0.910 | 0.872 | 0.799 | 0.692 |
| cycle | C | statistical | 0.725 | 0.774 | 0.424 | 0.487 |

- cycle/statistical — A: 마찰 AUROC 0.977/Recall 1.000, 하중 AUROC 0.872/Recall 0.667; B: 마찰 AUROC 0.650/Recall 0.236, 하중 AUROC 0.620/Recall 0.224; C: 마찰 AUROC 0.725/Recall 0.424, 하중 AUROC 0.774/Recall 0.487
- action/statistical — A: 마찰 AUROC 0.960/Recall 1.000, 하중 AUROC 0.849/Recall 0.628; B: 마찰 AUROC 0.744/Recall 0.146, 하중 AUROC 0.669/Recall 0.115; C: 마찰 AUROC 0.760/Recall 0.375, 하중 AUROC 0.836/Recall 0.468
- cycle/isolation_forest — A: 마찰 AUROC 0.886/Recall 0.368, 하중 AUROC 0.901/Recall 0.628; B: 마찰 AUROC 0.570/Recall 0.139, 하중 AUROC 0.591/Recall 0.135; C: 마찰 AUROC 0.619/Recall 0.194, 하중 AUROC 0.715/Recall 0.282
- action/isolation_forest — A: 마찰 AUROC 0.930/Recall 0.562, 하중 AUROC 0.857/Recall 0.429; B: 마찰 AUROC 0.674/Recall 0.139, 하중 AUROC 0.651/Recall 0.064; C: 마찰 AUROC 0.676/Recall 0.160, 하중 AUROC 0.716/Recall 0.090
- cycle/pca — A: 마찰 AUROC 0.860/Recall 0.500, 하중 AUROC 0.524/Recall 0.058; B: 마찰 AUROC 0.805/Recall 0.361, 하중 AUROC 0.654/Recall 0.199; C: 마찰 AUROC 0.910/Recall 0.799, 하중 AUROC 0.872/Recall 0.692
- action/pca — A: 마찰 AUROC 0.839/Recall 0.569, 하중 AUROC 0.543/Recall 0.154; B: 마찰 AUROC 0.749/Recall 0.097, 하중 AUROC 0.680/Recall 0.083; C: 마찰 AUROC 0.851/Recall 0.319, 하중 AUROC 0.822/Recall 0.288

높은 AUROC와 고정 threshold의 Recall은 별개다. B/C나 Action을 추가했다고 무조건 개선되는지는 위 표의 동일 알고리즘 간 차이로 판단한다. paired_ablation_deltas.csv에는 같은 평가 사이클을 함께 재표집한 마찰/하중 AUROC 차이의 95% 구간(300회, 이상/정상 층화)을 저장했다. 이는 배치 상관·다중 비교·기존 EDA 노출을 보정한 확증적 검정이 아니다. 이 결과로 모델을 사후 수정하거나 테스트에 맞춰 최적 조건을 재학습하지 않았다.

## 정상 배치별 오탐률

| representation | input_set | algorithm | 73 | 74 | 75 | 76 |
| --- | --- | --- | --- | --- | --- | --- |
| action | A | isolation_forest | 0.019 | 0.243 | 0.227 | 0.053 |
| action | A | pca | 0.129 | 0.432 | 0.114 | 0.105 |
| action | A | statistical | 0.019 | 0.649 | 0.727 | 0.211 |
| action | B | isolation_forest | 0.053 | 0.027 | 0.023 | 0.105 |
| action | B | pca | 0.056 | 0.000 | 0.068 | 0.895 |
| action | B | statistical | 0.034 | 0.027 | 0.045 | 0.105 |
| action | C | isolation_forest | 0.044 | 0.054 | 0.068 | 0.105 |
| action | C | pca | 0.031 | 0.000 | 0.068 | 0.474 |
| action | C | statistical | 0.088 | 0.054 | 0.500 | 0.158 |
| cycle | A | isolation_forest | 0.009 | 0.189 | 0.455 | 0.105 |
| cycle | A | pca | 0.031 | 0.405 | 0.000 | 0.000 |
| cycle | A | statistical | 0.019 | 0.676 | 0.659 | 0.158 |
| cycle | B | isolation_forest | 0.091 | 0.000 | 0.136 | 0.211 |
| cycle | B | pca | 0.022 | 0.108 | 0.068 | 0.263 |
| cycle | B | statistical | 0.078 | 0.054 | 0.205 | 0.263 |
| cycle | C | isolation_forest | 0.125 | 0.000 | 0.205 | 0.211 |
| cycle | C | pca | 0.075 | 0.378 | 0.477 | 0.316 |
| cycle | C | statistical | 0.119 | 0.054 | 0.318 | 0.211 |

normal_batch_fpr.csv에는 배치별 분모·오탐 수·Wilson 95% 구간도 있다. 작은 배치(특히 setting76의 n=19)는 오탐률 추정 폭이 넓다. PRE_A 무작위 검증에서 낮은 오탐률을 맞춰도 다른 정상 배치에서 유지되는지 따로 확인해야 한다. 이 배치 차이는 실험 시점/환경/조건의 복합 차이이므로 하나의 물리적 원인으로 해석하지 않는다. 현재 결과를 보고 배치73~76으로 threshold를 다시 맞추면 안 된다.

## 전체 사이클과 Action / 센서 추가 효과

| comparison | macro_auroc_gain | fpr_change |
| --- | --- | --- |
| cycle/statistical: B-A | -0.120 | -0.053 |
| cycle/statistical: C-B | 0.036 | 0.041 |
| action/statistical: B-A | -0.022 | -0.119 |
| action/statistical: C-B | 0.009 | 0.093 |
| A/statistical: action-cycle | -0.027 | 0.007 |
| B/statistical: action-cycle | 0.072 | -0.060 |
| C/statistical: action-cycle | 0.045 | -0.007 |
| cycle/isolation_forest: B-A | -0.162 | 0.017 |
| cycle/isolation_forest: C-B | 0.029 | 0.033 |
| action/isolation_forest: B-A | -0.075 | -0.012 |
| action/isolation_forest: C-B | 0.001 | 0.000 |
| A/isolation_forest: action-cycle | -0.018 | -0.014 |
| B/isolation_forest: action-cycle | 0.068 | -0.043 |
| C/isolation_forest: action-cycle | 0.040 | -0.076 |
| cycle/pca: B-A | 0.187 | -0.014 |
| cycle/pca: C-B | 0.075 | 0.110 |
| action/pca: B-A | 0.262 | -0.062 |
| action/pca: C-B | 0.043 | -0.038 |
| A/pca: action-cycle | -0.033 | 0.093 |
| B/pca: action-cycle | 0.042 | 0.045 |
| C/pca: action-cycle | 0.010 | -0.103 |

gain은 후보-기준, 양수이면 AUROC 증가이고 fpr_change의 음수는 오탐 감소다. 이는 이번 고정 실험의 변화이며 일반적인 개선 보장은 아니다. 모델별 결과가 다르면 입력 정보 자체와 알고리즘 적합성의 영향을 분리해 해석해야 한다. 특징 차원·중복도·상관이 크게 달라 통계 점수/IF/PCA가 똑같은 정보 증가를 같은 방식으로 활용하지 않는다.

## xArm 설계에 미치는 영향

1. **INA226만 쓸 때의 근거:** A의 마찰/하중 Recall과 정상 배치 FPR을 함께 본다. 전류·전압으로 모든 관절 이상을 충분히 탐지한다고 전제하지 않는다. 100Hz 제공 신호에서 얻은 성능이 실제 INA226 갱신률/필터/전원 조건에서도 유지되는지는 별도 실측한다.
2. **위치·속도 피드백 수집:** B-A의 같은 알고리즘/표현 대비 변화가 수집 기능의 실험 근거다. 목표값·실제 위치 접근 가능성과 동기화를 먼저 검증한다. 실제 속도를 위치 차분으로 구하면 잡음/지연이 달라지므로 이 실험의 joint_velocity와 동등하다고 가정하지 않는다.
3. **산업용 참고 정보의 가치:** C-B는 iq 추가의 효과이며 xArm에서 iq가 없을 때의 정보 차이를 보여주는 참고다. 외부 DC 전류를 관절 iq의 대체값으로 넣지 않는다.
4. **작업 상태 인터페이스:** Action 비교에서 이득이 있어도 컨트롤러가 동작 상태·구간 종료를 실시간 전달할 수 있어야 한다. 센서 신호에서 Action을 추정하는 별도 문제는 이번 실험에 포함하지 않았다.
5. **정상 수집 계획:** 배치 이동에 견딜 수 있는 정상 기준을 만들려면 xArm의 여러 날짜·전원·반복 부하·동작 조건에서 정상 데이터를 수집하고, 학습/검증/독립 평가를 실험 세션 단위로 나눠야 한다. 공개 데이터의 임계값을 xArm에 그대로 쓰지 않는다.

## 검증·재현·한계

- 코드 검토에서 03의 setting 매핑·부호 있는 오차 정의·연속 action+active 경계 처리 원칙을 재사용했다. 기존 특징 함수는 관절 iq/오차 일부만 다루고 전체 12종·전압·미분·B의 원신호 통계가 없어 독립 baseline_core.py로 확장했다. 기존 01~04 코드는 수정하지 않았다.
- 분할과 원시 특징·모델·점수·threshold를 저장했고, 코드/설정/공식 정의 SHA-256, 버전, 데이터 경로·크기·mtime을 frozen_protocol.json에 기록했다. 데이터 전체 파일 SHA-256은 계산하지 않았다.
- 테스트는 평가 특징을 극단값으로 바꿔도 학습 scaler·검증 threshold가 바뀌지 않음, split 격리, 입력 메타데이터 배제, 미분 경계, score 방향과 confusion matrix를 검증한다. 실행 결과는 validation_checks.json과 별도 test log를 확인한다.
- random seed는 1개로 고정했고 다중 seed 안정성은 아직 검증하지 않았다. PRE_A 내부 무작위 분할은 인접 사이클 상관을 제거하지 못해 내부 검증이 낙관적일 수 있다. 외부 테스트도 기존 EDA에 노출되었으며, 여러 조건 중 최고값은 선택 편향이 있다.
- 특징 계산 전후 CPU 시간은 수집 지연/통신/Edge 전체 지연을 의미하지 않는다. runtime.csv의 시간은 모델 학습+모든 사이클 scoring 합계이며 Pi 추론 지연으로 인용하지 않는다.
- 현재 입력은 진동·표면온도를 포함하지 않는다. 이들은 xArm 자체 실험에서 가치와 동기화·추가 비용을 따로 평가한다.
- 최종 독립 검증: **미실시**. 다음 단계는 현재 프로토콜을 기준으로 배포 후보를 별도 결정하고, 신규 실험 세션에서 모델·threshold를 고정한 평가를 수행하는 것이다. 미래 고장 예측은 사건 정의와 시간 연속 라벨부터 새로 설계한다.

## 출처

- 공식 Category/Variant/Action과 정상 분할: https://github.com/vorausrobotik/voraus-ad-dataset/blob/main/voraus_ad.py (baseline_reference/voraus_ad.py 로컬 스냅샷)
- 유형별 AUROC 및 12종 평균 권고: 논문 V-A https://arxiv.org/html/2311.04765v1#S5.SS1
