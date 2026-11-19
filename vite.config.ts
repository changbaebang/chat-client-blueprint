import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { chatApi } from './server/plugin'

// The build input stays the default index.html only, so dev/ui.html (step 04) never reaches dist.
export default defineConfig({
  plugins: [react(), chatApi()],
  ...(process.env.E2E_CACHE_DIR ? { cacheDir: process.env.E2E_CACHE_DIR } : {}),
  // strictPort: if 5173 is taken, fail instead of silently moving to 5174.
  server: { port: 5173, strictPort: true },
})
