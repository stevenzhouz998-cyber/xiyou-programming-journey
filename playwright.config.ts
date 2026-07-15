import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  reporter: [['line'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173/xiyou-programming-journey/',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'block',
  },
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/xiyou-programming-journey/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'desktop-chromium-1440x1024',
      grep: /@legacy|@full|@storage|@keyboard|@corrupt-full|@cold/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1024 } },
    },
    {
      name: 'tablet-webkit-768x1024',
      grep: /@legacy|@full|@parity|@corrupt-smoke|@cold/,
      use: { browserName: 'webkit', viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'visual-chromium-768x1024',
      grep: /@visual/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'mobile-chromium-390x844',
      grep: /@legacy|@full|@parity|@cold/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'desktop-firefox-1440x1024',
      grep: /@legacy|@full|@keyboard|@corrupt-smoke|@cold/,
      use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 1024 } },
    },
    {
      name: 'narrow-chromium-320x844',
      grep: /@legacy|@narrow|@cold/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
});
