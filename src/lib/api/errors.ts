const STATUS_TEXT: Record<number, string> = {
  400: '요청이 올바르지 않습니다',
  404: '요청한 항목을 찾을 수 없습니다',
  405: '허용되지 않는 요청입니다',
  422: '조회 조건이 올바르지 않습니다',
  429: '요청이 너무 많거나 연결 수 한도를 넘었습니다',
}

/** HTTP 4xx/5xx 응답. 메시지는 사용자에게 그대로 보여 줄 수 있다. */
export class ApiHttpError extends Error {
  readonly status: number
  readonly path: string
  readonly detail: string | null
  constructor(status: number, path: string, detail: string | null) {
    const base = STATUS_TEXT[status] ?? (status >= 500 ? '서버 오류가 발생했습니다' : '요청을 처리하지 못했습니다')
    super(`${base} (HTTP ${status})${detail ? ` · ${detail}` : ''}`)
    this.name = 'ApiHttpError'
    this.status = status
    this.path = path
    this.detail = detail
  }
}

/** 네트워크 실패·시간 초과 등 응답을 받지 못한 경우. */
export class ApiNetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApiNetworkError'
  }
}

/** 응답 본문의 `detail` 문자열만 꺼낸다(없거나 JSON이 아니면 null). 로그 문자열은 텍스트로만 쓴다. */
export async function readDetail(response: Response): Promise<string | null> {
  try {
    const body: unknown = await response.json()
    if (body && typeof body === 'object' && 'detail' in body) {
      const d = (body as { detail: unknown }).detail
      return typeof d === 'string' ? d.slice(0, 200) : null
    }
  } catch {
    /* 본문 없음 */
  }
  return null
}

export function networkError(e: unknown): Error {
  if (e instanceof ApiHttpError || e instanceof ApiNetworkError) return e
  if (e instanceof DOMException && e.name === 'AbortError') {
    return new ApiNetworkError('요청이 취소되었거나 시간이 초과되었습니다.')
  }
  if (e instanceof TypeError) return new ApiNetworkError('서버에 연결할 수 없습니다.')
  return e instanceof Error ? e : new Error(String(e))
}
