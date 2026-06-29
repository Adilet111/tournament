import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const authTarget = env.VITE_AUTH_PROXY_TARGET || 'http://localhost:3000'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Forward /auth/* to the backend so the browser avoids CORS in dev.
      // Only used when VITE_AUTH_API_BASE is left blank.
      proxy: {
        '/auth': { target: authTarget, changeOrigin: true },
      },
    },
  }
})
