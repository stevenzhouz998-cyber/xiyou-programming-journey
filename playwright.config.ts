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
    command: 'npm run build:e2e && npm run preview -- --outDir dist-e2e --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/xiyou-programming-journey/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'desktop-chromium-1440x1024',
      grep: /@week-one-system|@legacy|@full|@storage|@keyboard|@visual|@corrupt-full|@cold|@lazy-boundary|@staff-full|@staff-storage|@staff-keyboard|@staff-parity|@staff-corrupt|@staff-cold|@staff-parent|@staff-lazy|@regalia-full|@regalia-storage|@regalia-keyboard|@regalia-parity|@regalia-external|@regalia-corrupt|@regalia-cold|@regalia-parent|@regalia-lazy|@regalia-narrow|@advanced-full|@advanced-storage|@advanced-external|@advanced-parent|@advanced-corrupt|@advanced-cold|@advanced-chunk-fault|@advanced-asset-fault|@advanced-keyboard|@advanced-parity/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1024 } },
    },
    {
      name: 'tablet-webkit-768x1024',
      grep: /@week-one-system|@legacy|@full|@parity|@corrupt-smoke|@cold|@staff-full|@staff-parity|@staff-corrupt|@staff-cold|@regalia-full|@regalia-parity|@regalia-corrupt|@regalia-cold|@advanced-full|@advanced-parity|@advanced-corrupt|@advanced-cold|@advanced-asset-fault/,
      use: { browserName: 'webkit', viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'mobile-chromium-390x844',
      grep: /@week-one-system|@legacy|@full|@parity|@cold|@staff-full|@staff-parity|@staff-cold|@regalia-full|@regalia-parity|@regalia-cold|@regalia-narrow|@advanced-full|@advanced-parity|@advanced-cold|@advanced-narrow|@advanced-asset-fault/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'desktop-firefox-1440x1024',
      grep: /@week-one-system|@legacy|@full|@keyboard|@corrupt-smoke|@cold|@staff-full|@staff-keyboard|@staff-corrupt|@staff-cold|@regalia-full|@regalia-keyboard|@regalia-corrupt|@regalia-cold|@advanced-full|@advanced-keyboard|@advanced-corrupt|@advanced-cold|@advanced-asset-fault/,
      use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 1024 } },
    },
    {
      name: 'narrow-chromium-320x844',
      grep: /@week-one-system|@legacy|@narrow|@cold|@staff-full|@staff-cold|@regalia-full|@regalia-narrow|@regalia-cold|@advanced-full|@advanced-narrow|@advanced-cold|@advanced-asset-fault/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
});
