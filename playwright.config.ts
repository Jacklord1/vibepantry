import { defineConfig, devices } from '@playwright/test'

// VibePantry E2E — drives the real app (Vite dev server) in a phone-sized
// Chromium. The primary surface is the phone, so the default project is a
// 390×844 viewport (iPhone 12/13/14 logical size). A 360-wide "small phone"
// project guards the tightest layouts.
// Port is env-overridable so parallel worktrees/threads don't collide on one
// dev server (defaults to 5173 for CI + the usual single-checkout case).
const PORT = Number(process.env.E2E_PORT) || 5173
const baseURL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : [['list']],
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        // Pin a deterministic 390×844 logical viewport; keep touch + mobile.
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        // Headless Chromium needs a UA that doesn't trip the desktop layer.
        defaultBrowserType: 'chromium',
      },
    },
    {
      name: 'small',
      use: {
        ...devices['iPhone 13'],
        viewport: { width: 360, height: 780 },
        isMobile: true,
        hasTouch: true,
        defaultBrowserType: 'chromium',
      },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
