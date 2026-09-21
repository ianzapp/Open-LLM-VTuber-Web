import { defineConfig, devices } from '@playwright/test';

// Runs against a deployed build served by the backend, e.g.
//   BASE_URL=http://localhost:12393/next/ npm run e2e
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  use: { baseURL: process.env.BASE_URL, channel: 'chrome', trace: 'retain-on-failure' },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'], channel: 'chrome' } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 900 }, channel: 'chrome' } },
  ],
});
