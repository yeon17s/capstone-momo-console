export interface ModelSelection {
  representation: string
  input_set: string
  algorithm: string
}

export interface ModelRow extends ModelSelection {
  scope: string
  threshold: number
  validation_fpr: number
  macro_category_auroc: number
  n_normal: number
  n_anomaly: number
  auroc: number
  pr_auc_ap: number
  precision: number
  recall: number
  f1: number
  normal_fpr: number
  tn: number
  fp: number
  fn: number
  tp: number
}

export interface CategoryRow extends ModelSelection {
  category: number
  category_name: string
  n_normal: number
  n_anomaly: number
  auroc: number
  pr_auc_ap: number
  recall: number
}

export interface BatchRow extends ModelSelection {
  setting: number
  variant: string
  n_normal: number
  false_positives: number
  normal_fpr: number
  fpr_ci_low: number
  fpr_ci_high: number
}

export interface CycleRow extends ModelSelection {
  sample: number
  category: number
  setting: number
  anomaly: boolean | null
  category_name: string
  variant_name: string
  split: string
  score: number
  threshold: number
  prediction: boolean | null
}

export interface GroupRow {
  combination: string
  algorithm: string
  representation: string
  n_signals: number
  retained_features: number
  macro_category_auroc: number
  auroc: number
  recall: number
  normal_fpr: number
  threshold: number
}

export interface ImportanceRow {
  protocol: string
  algorithm: string
  input_set: string
  feature: string
  mean_importance: number | null
  std_importance: number | null
  observed_folds: number
  positive_folds: number
  top10_folds: number
  mean_rank_position: number
}

export interface TopKRow {
  protocol: string
  algorithm: string
  input_set: string
  k: string
  auroc_mean: number
  auroc_sd: number
  recall_mean: number
  normal_fpr_mean: number
  n_features_min: number
  n_features_max: number
}

export interface OofRow {
  protocol: string
  algorithm: string
  input_set: string
  setting: number
  variant_name: string
  unseen_setting: boolean | null
  false_positives: number
  n_normal: number
  normal_fpr: number
}

export interface Config {
  seed: number
  active_actions: number[]
  pca_explained_variance: number
  iforest_trees: number
  iforest_max_samples: number
}

export type Scope = 'all_12' | string
