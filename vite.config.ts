import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  // 公共基础路径，部署到子目录时修改（如 '/portal/'）
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        // 自动导入 mixin，注意这里假设 assets/css/mixin.scss 存在，稍后需要创建
        additionalData: `@use "@/assets/css/mixin.scss" as *;`
      }
    }
  },
  server: {
    host: '0.0.0.0', // 或者 host: '0.0.0.0'，允许局域网访问
    port: 3002,
    proxy: {
      '/api': {
        target: 'http://localhost:4001/',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        chunkFileNames: 'static/js/[name]-[hash].js',
        entryFileNames: 'static/js/[name]-[hash].js',
        assetFileNames: 'static/[ext]/[name]-[hash].[ext]',
      }
    }
  }
})
