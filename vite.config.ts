import { defineConfig } from 'vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    electron({
      main: {
        // 主进程入口
        entry: 'electron/main.ts',
      },
      preload: {
        // 预加载脚本入口
        input: 'electron/preload.ts',
      },
      // 可选：渲染进程多页面配置
      renderer: {},
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9097',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/ws-traffic': {
        target: 'ws://127.0.0.1:9097/traffic',
        ws: true,
        rewrite: (path) => path.replace(/^\/ws-traffic/, '')
      }
    }
  }
})