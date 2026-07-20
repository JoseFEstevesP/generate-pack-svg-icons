import { defineConfig } from 'vite'
import path from 'path'

const uiDir = path.resolve(__dirname)

export default defineConfig({
  root: uiDir,
  base: './',
  resolve: {
    alias: {
      '@': path.join(uiDir, 'src'),
    },
  },
  build: {
    outDir: path.join(uiDir, 'dist'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    fs: {
      allow: [path.resolve(uiDir, '..')],
    },
  },
})
