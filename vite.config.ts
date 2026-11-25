import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // 개발 중 같은 출처처럼 보이도록 /api 를 xArm Pi 서버로 프록시한다 (CORS 불필요).
  const target = env.VITE_API_TARGET
  return {
    plugins: [react()],
    server: target
      ? { proxy: { '/api': { target, changeOrigin: true } } }
      : undefined,
  }
})
