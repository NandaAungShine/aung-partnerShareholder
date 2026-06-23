import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/auth': {
        target: 'http://130.94.21.185:5000',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'http://130.94.21.185:5000',
        changeOrigin: true,
        secure: false,
      },
      
      '^/(.*\\.(webp|png|jpg|jpeg|gif|svg|ico))$': {
        target: 'http://130.94.21.185:5000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})