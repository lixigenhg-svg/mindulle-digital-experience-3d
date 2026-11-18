import { defineConfig } from '@playwright/test';

const PORT = 28173;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'docs/playwright-report', open: 'never' }], ['json', { outputFile: 'docs/playwright-results.json' }]],
  outputDir: 'test-results',
  use: {
    baseURL: BASE_URL,
    headless: true,
    launchOptions: {
      executablePath: '/usr/local/bin/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader']
    },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off'
  },
  projects: [
    {
      name: 'desktop',
      testMatch: /temple\.spec\.ts/,
      use: { viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false }
    },
    {
      name: 'mobile',
      testMatch: /mobile\.spec\.ts/,
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }
    }
  ],
  webServer: {
    command: `VITE_WS_URL=off npm run dev -- --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000
  }
});
