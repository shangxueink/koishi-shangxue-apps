import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import vue from '@vitejs/plugin-vue'
import ViteYaml from '@modyfi/vite-plugin-yaml'
import { defineConfig } from 'vite'

const webRoot = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  root: webRoot,
  base: './',
  plugins: [vue(), ViteYaml()],
  server: {
    port: 5174,
    strictPort: true,
    proxy: {
      '/satori': {
        target: 'http://127.0.0.1:5140',
        changeOrigin: true,
        ws: true,
      },
      '/chat-patch': {
        target: 'http://127.0.0.1:5140',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: resolve(webRoot, 'dist'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 1500,
  },
})
