/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 별도 출처의 API 서버. 비우면 같은 출처(+dev proxy)를 사용한다. */
  readonly VITE_API_BASE?: string
}
