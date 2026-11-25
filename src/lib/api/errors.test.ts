import { describe, expect, it, vi } from 'vitest'
import { Client } from './client'
import { ApiHttpError, ApiNetworkError, networkError } from './errors'

const client = (f: typeof fetch) => new Client({ fetchImpl: f, EventSourceImpl: null })

describe('오류 문구', () => {
  it('HTTP 상태별 사용자 문구와 서버 detail 을 함께 보여 준다', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ detail: 'limit must be 1..250' }), { status: 422 })) as unknown as typeof fetch
    const err = await client(f).listCycles({ limit: 999 }).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiHttpError)
    expect((err as ApiHttpError).message).toBe('조회 조건이 올바르지 않습니다 (HTTP 422) · limit must be 1..250')
    expect((err as ApiHttpError).status).toBe(422)
  })
  it('본문이 JSON 이 아니어도 상태 문구는 나온다 (5xx)', async () => {
    const f = vi.fn(async () => new Response('<html>boom</html>', { status: 502 })) as unknown as typeof fetch
    const err = await client(f).status().catch((e: unknown) => e)
    expect((err as Error).message).toBe('서버 오류가 발생했습니다 (HTTP 502)')
  })
  it('detail 이 HTML 이어도 문자열 그대로 보존(텍스트로만 렌더링)', async () => {
    const f = vi.fn(async () => new Response(JSON.stringify({ detail: '<img src=x onerror=1>' }), { status: 400 })) as unknown as typeof fetch
    const err = await client(f).status().catch((e: unknown) => e)
    expect((err as ApiHttpError).detail).toBe('<img src=x onerror=1>')
  })
  it('네트워크 실패는 연결 불가 문구', async () => {
    const f = vi.fn(async () => { throw new TypeError('Failed to fetch') }) as unknown as typeof fetch
    const err = await client(f).status().catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ApiNetworkError)
    expect((err as Error).message).toBe('서버에 연결할 수 없습니다.')
  })
  it('취소·시간 초과는 별도 문구', () => {
    expect(networkError(new DOMException('x', 'AbortError')).message).toContain('시간이 초과')
  })
})
