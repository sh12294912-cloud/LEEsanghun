import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 상대 경로로 빌드 → GitHub Pages 하위 경로(/my-fit/)나 어디에 올려도 동작 (HashRouter 사용)
export default defineConfig({
  base: './',
  plugins: [react()],
})
