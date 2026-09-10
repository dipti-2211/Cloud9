import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: false,   // bump to 5174 if 5173 is taken
    host: true,
    proxy: {
      // Forward all /api/* calls to the backend — eliminates CORS entirely
      '/api': {
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
