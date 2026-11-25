import { afterEach } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { ApiContext, type ApiContextValue } from '../context/ApiContext'
import { SourceContext, type SourceMode } from '../context/SourceContext'
import type { Client } from '../lib/api'

afterEach(cleanup)

// jsdom 에 없는 브라우저 API 스텁 (차트 훅이 사용). 실제 그리기는 하지 않는다.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof HTMLCanvasElement.prototype.getContext
}

export const apiValue = (over: Partial<ApiContextValue> = {}): ApiContextValue => ({
  client: null,
  connection: 'connected',
  status: null,
  models: null,
  cycles: null,
  refreshCount: 0,
  error: null,
  ...over,
})

/** Context 값을 직접 주입해 렌더링한다. client 는 필요한 메서드만 가진 가짜 객체를 쓴다. */
export function renderWith(ui: ReactElement, opts: { api?: Partial<ApiContextValue>; mode?: SourceMode; setMode?: (m: SourceMode) => void } = {}) {
  const mode = opts.mode ?? 'xarm-live'
  const result = render(
    <SourceContext value={{ mode, setMode: opts.setMode ?? (() => {}), usesApi: mode !== 'public' }}>
      <ApiContext value={apiValue(opts.api)}>{ui}</ApiContext>
    </SourceContext>,
  )
  return result
}

export const fakeClient = (methods: Record<string, unknown>) => methods as unknown as Client
