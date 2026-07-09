import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const authTarget = env.VITE_AUTH_PROXY_TARGET || 'http://localhost:3000'

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Forward API calls to the backend so the browser avoids CORS in dev.
      // Everything is served under /api/* (auth, tournaments, sports, profiles,
      // admin) and hits the dev proxy when VITE_API_BASE / VITE_AUTH_API_BASE
      // are blank.
      proxy: {
        '/api': { target: authTarget, changeOrigin: true },
      },
    },
  }
})
