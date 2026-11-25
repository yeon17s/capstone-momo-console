#!/usr/bin/env node
// payload.json 에서 Settings(연구 탭)에서만 쓰는 표를 payload.research.json 으로 분리한다. 값은 바꾸지 않는다.
// 사용: node scripts/split-payload.mjs   (이미 분리돼 있으면 아무것도 하지 않는다)
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const dir = new URL('../src/data/', import.meta.url)
const corePath = new URL('payload.json', dir)
const researchPath = new URL('payload.research.json', dir)
const RESEARCH_KEYS = ['groups', 'importance', 'topk', 'oof']

const all = JSON.parse(readFileSync(corePath, 'utf8'))
if (!RESEARCH_KEYS.some((k) => k in all)) {
  console.log('이미 분리되어 있습니다.', existsSync(researchPath) ? '' : '(research 파일 없음!)')
  process.exit(0)
}
const research = {}
for (const k of RESEARCH_KEYS) {
  research[k] = all[k]
  delete all[k]
}
writeFileSync(corePath, JSON.stringify(all))
writeFileSync(researchPath, JSON.stringify(research))
console.log('core:', Object.keys(all).join(', '))
console.log('research:', Object.keys(research).join(', '))
