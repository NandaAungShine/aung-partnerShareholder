import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://130.94.23.117:5000',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://130.94.23.117:5000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy all image files (including those under /uploads/)
      '^/(.*\\.(webp|png|jpg|jpeg|gif|svg|ico))$': {
        target: 'http://130.94.23.117:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})