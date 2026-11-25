// @vitest-environment jsdom
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '@testing-library/react'
import '../test/render' // afterEach(cleanup)

// ApiProvider 가 만드는 Client 를 가짜로 바꿔 생명주기만 확인한다.
const { created, FakeClient } = vi.hoisted(() => {
  const created: InstanceType<typeof FakeClient>[] = []
  class FakeClient {
    active = false
    starts = 0
    stops = 0
    handlers: Record<string, ((...a: unknown[]) => void) | undefined>
    constructor(opts: Record<string, (...a: unknown[]) => void>) {
      this.handlers = opts
      created.push(this)
    }
    async start() {
      this.active = true
      this.starts++
    }
    stop() {
      this.active = false
      this.stops++
    }
  }
  return { created, FakeClient }
})
vi.mock('../lib/api', () => ({ Client: FakeClient }))

import { ApiProvider, useApi } from './ApiContext'
import { SourceProvider, useSource } from './SourceContext'

function Probe() {
  const { mode, setMode } = useSource()
  const { client, connection, status, error, refreshCount } = useApi()
  return (
    <div>
      <span data-testid="mode">{mode}</span>
      <span data-testid="client">{client ? 'yes' : 'no'}</span>
      <span data-testid="conn">{connection}</span>
      <span data-testid="status">{status ? status.mode : 'none'}</span>
      <span data-testid="error">{error ?? ''}</span>
      <span data-testid="refresh">{refreshCount}</span>
      <button onClick={() => setMode('xarm-live')}>live</button>
      <button onClick={() => setMode('xarm-history')}>history</button>
      <button onClick={() => setMode('public')}>public</button>
    </div>
  )
}

const mount = (strict = false) => {
  const tree = (
    <SourceProvider>
      <ApiProvider>
        <Probe />
      </ApiProvider>
    </SourceProvider>
  )
  return render(strict ? <StrictMode>{tree}</StrictMode> : tree)
}
const active = () => created.filter((c) => c.active)

beforeEach(() => {
  created.length = 0
})

describe('ApiProvider 생명주기', () => {
  it('공개 모드에서는 Client 를 만들지 않고 idle', () => {
    mount()
    expect(created).toHaveLength(0)
    expect(screen.getByTestId('client').textContent).toBe('no')
    expect(screen.getByTestId('conn').textContent).toBe('idle')
  })

  it('xArm 모드로 바꾸면 시작하고, 공개로 돌아가면 중지한다', async () => {
    mount()
    await userEvent.click(screen.getByText('live'))
    expect(active()).toHaveLength(1)
    expect(screen.getByTestId('client').textContent).toBe('yes')
    await userEvent.click(screen.getByText('public'))
    expect(active()).toHaveLength(0)
    expect(screen.getByTestId('client').textContent).toBe('no')
  })

  it('xArm 저장 이력 ↔ 현재 상태 전환은 같은 연결을 유지한다 (재시작 없음)', async () => {
    mount()
    await userEvent.click(screen.getByText('live'))
    const first = active()[0]
    await userEvent.click(screen.getByText('history'))
    expect(active()).toEqual([first])
    expect(first.starts).toBe(1)
    expect(first.stops).toBe(0)
  })

  it('StrictMode(개발 모드 이중 effect)에서도 활성 Client 는 하나', async () => {
    mount(true)
    await userEvent.click(screen.getByText('live'))
    expect(active()).toHaveLength(1)
  })

  it('모드를 떠났다 돌아오면 이전 모드의 상태가 남지 않는다', async () => {
    mount()
    await userEvent.click(screen.getByText('live'))
    const c = created[created.length - 1]
    act(() => {
      c.handlers.onStatus?.({ mode: 'live', latest: null })
      c.handlers.onConnection?.('connected')
      c.handlers.onError?.(new Error('boom'))
      c.handlers.onRefreshRequired?.('initial')
    })
    expect(screen.getByTestId('status').textContent).toBe('live')
    expect(screen.getByTestId('conn').textContent).toBe('connected')
    expect(screen.getByTestId('error').textContent).toBe('boom')
    expect(screen.getByTestId('refresh').textContent).toBe('1')
    await userEvent.click(screen.getByText('public'))
    expect(screen.getByTestId('status').textContent).toBe('none')
    expect(screen.getByTestId('conn').textContent).toBe('idle')
    expect(screen.getByTestId('error').textContent).toBe('')
    await userEvent.click(screen.getByText('live'))
    expect(screen.getByTestId('status').textContent).toBe('none')
  })

  it('새 status 를 받으면 이전 오류를 지운다', async () => {
    mount()
    await userEvent.click(screen.getByText('live'))
    const c = created[created.length - 1]
    act(() => c.handlers.onError?.(new Error('boom')))
    expect(screen.getByTestId('error').textContent).toBe('boom')
    act(() => c.handlers.onStatus?.({ mode: 'live', latest: null }))
    expect(screen.getByTestId('error').textContent).toBe('')
  })

  it('pagehide 에서 stop, bfcache 복원(pageshow persisted)에서 다시 start', async () => {
    mount()
    await userEvent.click(screen.getByText('live'))
    const c = active()[0]
    act(() => {
      window.dispatchEvent(new Event('pagehide'))
    })
    expect(c.active).toBe(false)
    act(() => {
      const ev = new Event('pageshow') as Event & { persisted: boolean }
      ev.persisted = true
      window.dispatchEvent(ev)
    })
    expect(c.active).toBe(true)
  })
})
