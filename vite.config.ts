import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

// base './' + 相对资源 → 根域名 / 子路径 / 将来 Electron(file://) 套壳均可直接 serve
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    // 把大型第三方库拆成独立 chunk: 利于浏览器缓存(改业务代码不必重下 vendor), 并消除单包过大警告
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion'],
          viz: ['d3-force', 'gsap'],
        },
      },
    },
    // 主 chunk 大头是内置富词库 data/ogden.json (850 词, 含释义/例句/音标),
    // 属静态数据而非可拆分代码; 阈值略放宽避免无意义告警噪音。
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 5174,
    open: true,
  },
})
