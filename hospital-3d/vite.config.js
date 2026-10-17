import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const contracts = path.resolve(here, '../shared-contracts')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, here, '')
  // PyroNav API (Member 4) — REST for initial room states, WebSocket for live
  // Decision Engine output. Proxied so the browser never needs CORS changes.
  const api = env.PYRONAV_API_TARGET || 'http://localhost:8000'
  const proxy = {
    '/api': { target: api, changeOrigin: true },
    '/ws':  { target: api.replace(/^http/, 'ws'), ws: true },
  }

  return {
    plugins: [react()],
    resolve: {
      // Room/sensor registry shared with the backend: shared-contracts/hospital-3d-sensors.json
      alias: { '@contracts': contracts },
    },
    server: {
      host: '0.0.0.0',
      port: Number(env.PORT || 5173),
      // Serve only this app and shared-contracts (dev server file access)
      fs: { allow: [here, contracts] },
      proxy,
    },
    preview: { host: '0.0.0.0', port: Number(env.PORT || 5173), proxy },
    build: { chunkSizeWarningLimit: 2000 },
  }
})
