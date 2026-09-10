import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
                            base: './',
                            server: {
                              port: 5173,
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
                                '/images': {
                                  target: 'http://130.94.21.185:5000',
                            changeOrigin: true,
                            secure: false,
                                }
                              }
                            }
})
