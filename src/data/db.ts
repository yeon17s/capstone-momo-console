import rawPayload from './payload.json'
import rawConfig from './config.json'
import type { BatchRow, CategoryRow, Config, CycleRow, ModelRow } from '../types'
import { expand, type Pack } from './expand'

// Dashboard·History 가 쓰는 표만 담는다. Settings 연구 탭 표(groups/importance/topk/oof)는 research.ts 에 분리.
const payload = rawPayload as unknown as Record<string, Pack>

export const DB = {
  models: expand<ModelRow>(payload.models),
  categories: expand<CategoryRow>(payload.categories),
  batches: expand<BatchRow>(payload.batches),
  cycles: expand<CycleRow>(payload.cycles),
}

export const CYCLE_COLUMNS = payload.cycles.columns

export const CONFIG = rawConfig as Config
