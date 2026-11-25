#!/usr/bin/env node
// docs/frontend-reference/results_03/aligned_timeseries.csv → src/data/aligned.json (화면 표시용 압축본)
//  - 값은 유효숫자 4자리로 반올림한다(차트 표시 전용, 수치 분석에는 원본 CSV 사용).
//  - 모든 계열의 progress_percent 격자가 같을 때만 변환한다. 다르면 중단한다.
// 사용: node scripts/build-aligned.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const src = new URL('../docs/frontend-reference/results_03/aligned_timeseries.csv', import.meta.url)
const out = new URL('../src/data/aligned.json', import.meta.url)

const lines = readFileSync(src, 'utf8').replace(/^﻿/, '').trim().split(/\r?\n/)
const header = lines[0].split(',')
const col = Object.fromEntries(header.map((h, i) => [h, i]))
for (const need of ['setting', 'affected_joint', 'action', 'signal', 'group', 'n_cycles', 'progress_percent', 'median', 'q10', 'q90']) {
  if (!(need in col)) throw new Error('열 누락: ' + need)
}
const r4 = (s) => {
  const v = Number(s)
  if (!Number.isFinite(v)) throw new Error('비유한 값: ' + s)
  return Number(v.toPrecision(4))
}

const series = {}
const settings = {}
const actions = new Set()
const signals = new Set()
const groups = new Set()
let grid = null
const gridOf = {}
for (const line of lines.slice(1)) {
  const c = line.split(',')
  const key = [c[col.setting], c[col.action], c[col.signal], c[col.group]].join('|')
  const s = (series[key] ??= { n: Number(c[col.n_cycles]), m: [], lo: [], hi: [] })
  const g = (gridOf[key] ??= [])
  g.push(Number(c[col.progress_percent]))
  s.m.push(r4(c[col.median]))
  s.lo.push(r4(c[col.q10]))
  s.hi.push(r4(c[col.q90]))
  settings[c[col.setting]] = Number(c[col.affected_joint])
  actions.add(Number(c[col.action]))
  signals.add(c[col.signal])
  groups.add(c[col.group])
}
for (const [key, g] of Object.entries(gridOf)) {
  grid ??= g
  if (g.length !== grid.length || g.some((v, i) => Math.abs(v - grid[i]) > 1e-9)) {
    throw new Error('progress_percent 격자가 계열마다 다릅니다: ' + key)
  }
}
const data = {
  note: '표시용 압축본(유효숫자 4자리). progress_percent 는 구간 내 정렬 진행률이며 실제 시각이 아니다.',
  progress: grid.map((v) => Number(v.toFixed(4))),
  settings,
  actions: [...actions].sort((a, b) => a - b),
  signals: [...signals].sort(),
  groups: [...groups].sort(),
  series,
}
writeFileSync(out, JSON.stringify(data))
console.log(`series ${Object.keys(series).length}, points/series ${grid.length}, bytes ${JSON.stringify(data).length}`)
