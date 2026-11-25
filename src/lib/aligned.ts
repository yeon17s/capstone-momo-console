/** `aligned_timeseries` 표시용 압축 데이터(src/data/aligned.json) 조회 함수. */
export interface AlignedSeries {
  /** 이 계열을 이루는 사이클 수 */
  n: number
  m: number[]
  lo: number[]
  hi: number[]
}

export interface AlignedData {
  note: string
  /** 모든 계열이 공유하는 정렬 진행률(%) 격자. 실제 시각이 아니다. */
  progress: number[]
  /** setting → affected_joint */
  settings: Record<string, number>
  actions: number[]
  signals: string[]
  groups: string[]
  series: Record<string, AlignedSeries>
}

export interface GroupSeries extends AlignedSeries {
  group: string
}

export const alignedKey = (setting: number | string, action: number | string, signal: string, group: string) =>
  `${setting}|${action}|${signal}|${group}`

const parsed = (data: AlignedData) =>
  Object.keys(data.series).map((key) => {
    const [setting, action, signal, group] = key.split('|')
    return { setting: Number(setting), action: Number(action), signal, group }
  })

export function availableSettings(data: AlignedData): number[] {
  return [...new Set(parsed(data).map((p) => p.setting))].sort((a, b) => a - b)
}

export function availableActions(data: AlignedData, setting: number): number[] {
  return [...new Set(parsed(data).filter((p) => p.setting === setting).map((p) => p.action))].sort((a, b) => a - b)
}

export function availableSignals(data: AlignedData, setting: number, action: number): string[] {
  return [
    ...new Set(parsed(data).filter((p) => p.setting === setting && p.action === action).map((p) => p.signal)),
  ].sort()
}

/** 같은 setting·action·signal 의 그룹별 계열. 서로 다른 setting/action 은 섞지 않는다. */
export function seriesFor(data: AlignedData, setting: number, action: number, signal: string): GroupSeries[] {
  return data.groups.flatMap((group) => {
    const s = data.series[alignedKey(setting, action, signal, group)]
    return s ? [{ group, ...s }] : []
  })
}
