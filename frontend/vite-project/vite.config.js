import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,   // Only run on 5173; do not switch to 5174 or other ports
    host: true,
    proxy: {
      // Forward all /api/* and /uploads/* calls to the backend
      '/api': {
        target: 'http://localhost:1710',
        changeOrigin: true,
        secure: false,
      },
      '/uploads': {
        target: 'http://localhost:1710',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
