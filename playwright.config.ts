import { defineConfig, devices } from '@playwright/test'

// Change the worker count with E2E_WORKERS, never with Playwright's --workers.
// Each worker gets its own server and data folder, so --workers would no longer match the number of servers (DESIGN 11.4).
const workers = Number(process.env.E2E_WORKERS ?? 4)
const preview = process.env.E2E_SERVER === 'preview'
const basePort = 5201

const servers = Array.from({ length: workers }, (_, i) => {
  const port = basePort + i
  return {
    command: preview
      ? `bun --bun vite preview --port ${port} --strictPort`
      : `bun --bun vite --port ${port} --strictPort`,
    url: `http://localhost:${port}/api/health`,
    reuseExistingServer: false,
    env: {
      DATA_DIR: `.e2e-data/w${i}`,
      DATA_RESET_ON_START: '1',
      E2E_CACHE_DIR: `node_modules/.vite-e2e/${port}`,
    },
  }
})

// Each worker process knows its own index and talks to its own server.
const parallelIndex = Number(process.env.TEST_PARALLEL_INDEX ?? 0)

export default defineConfig({
  testDir: 'src',
  testMatch: '**/*.e2e.ts',
  workers,
  fullyParallel: true,
  retries: 0,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: preview ? 'playwright-report/build' : 'playwright-report' }],
  ],
  use: {
    baseURL: `http://localhost:${basePort + parallelIndex}`,
    trace: 'off',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: servers,
})
