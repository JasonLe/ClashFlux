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
        // === 核心修复：配置 Vite 构建选项 ===
        vite: {
          build: {
            rollupOptions: {
              // 告诉打包工具：这两个包是外部的，不要尝试打包它们，运行时找不到也没关系（ws 会自动处理）
              external: ['bufferutil', 'utf-8-validate'],
            },
          },
        },
      },
      preload: {
        // 预加载脚本入口
        input: 'electron/preload.ts',
      },
      // 渲染进程配置
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