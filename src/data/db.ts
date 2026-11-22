import rawPayload from './payload.json'
import rawConfig from './config.json'
import type {
  BatchRow,
  CategoryRow,
  Config,
  CycleRow,
  GroupRow,
  ImportanceRow,
  ModelRow,
  OofRow,
  TopKRow,
} from '../types'

interface Pack {
  columns: string[]
  rows: unknown[][]
}

const payload = rawPayload as unknown as Record<string, Pack>

function expand<T>(pack: Pack): T[] {
  return pack.rows.map(
    (values) =>
      Object.fromEntries(pack.columns.map((key, i) => [key, values[i]])) as T,
  )
}

export const DB = {
  models: expand<ModelRow>(payload.models),
  categories: expand<CategoryRow>(payload.categories),
  batches: expand<BatchRow>(payload.batches),
  cycles: expand<CycleRow>(payload.cycles),
  groups: expand<GroupRow>(payload.groups),
  importance: expand<ImportanceRow>(payload.importance),
  topk: expand<TopKRow>(payload.topk),
  oof: expand<OofRow>(payload.oof),
}

export const CYCLE_COLUMNS = payload.cycles.columns

export const CONFIG = rawConfig as Config
