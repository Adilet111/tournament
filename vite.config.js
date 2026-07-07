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
      // /auth/* is used when VITE_AUTH_API_BASE is blank; /tournaments when
      // VITE_API_BASE is blank.
      proxy: {
        '/auth': { target: authTarget, changeOrigin: true },
        '/tournaments': { target: authTarget, changeOrigin: true },
        '/profiles': { target: authTarget, changeOrigin: true },
      },
    },
  }
})
