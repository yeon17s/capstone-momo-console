import rawResearch from './payload.research.json'
import type { GroupRow, ImportanceRow, OofRow, TopKRow } from '../types'
import { expand, type Pack } from './expand'

// Settings 의 공개 연구 탭(Ablation·MDI·Top-K·OOF) 전용. 운영 설정과 연결하지 않는다.
const payload = rawResearch as unknown as Record<string, Pack>

export const RESEARCH = {
  groups: expand<GroupRow>(payload.groups),
  importance: expand<ImportanceRow>(payload.importance),
  topk: expand<TopKRow>(payload.topk),
  oof: expand<OofRow>(payload.oof),
}
