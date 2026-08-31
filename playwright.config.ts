import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  preserveOutput: 'always',
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
      grep: /@week-one-system|@legacy|@full|@storage|@keyboard|@visual|@corrupt-full|@cold|@lazy-boundary|@staff-full|@staff-storage|@staff-keyboard|@staff-parity|@staff-corrupt|@staff-cold|@staff-parent|@staff-lazy|@regalia-full|@regalia-storage|@regalia-keyboard|@regalia-parity|@regalia-external|@regalia-corrupt|@regalia-cold|@regalia-parent|@regalia-lazy|@regalia-narrow|@advanced-full|@advanced-storage|@advanced-external|@advanced-parent|@advanced-corrupt|@advanced-cold|@advanced-chunk-fault|@advanced-asset-fault|@advanced-keyboard|@advanced-parity|@horse-full|@horse-keyboard|@horse-external|@horse-corrupt|@horse-parent|@horse-cold|@horse-asset-fault|@monkey-full|@monkey-keyboard|@monkey-external|@monkey-corrupt|@monkey-parent|@monkey-storage|@monkey-cold|@monkey-asset-fault|@monkey-lazy|@peach-full|@peach-keyboard|@peach-external|@peach-parent|@peach-corrupt|@peach-storage|@peach-cold|@peach-asset-fault|@peach-lazy|@furnace-full|@furnace-keyboard|@furnace-storage|@furnace-asset-fault|@furnace-cold|@boss-full|@boss-narrow|@boss-keyboard|@boss-storage|@boss-cold|@boss-corrupt|@boss-external|@boss-parent|@boss-asset-fault|@boss-lazy|@w3-m1-full|@w3-m1-keyboard|@w3-m1-storage|@w3-m1-corrupt|@w3-m1-parent|@w3-m1-cold|@w3-m1-asset-fault|@w3-m1-narrow|@w3-m1-external|@w3-m1-lazy|@w3-m2-full|@w3-m2-keyboard|@w3-m2-storage|@w3-m2-corrupt|@w3-m2-parent|@w3-m2-cold|@w3-m2-asset-fault|@w3-m2-narrow|@w3-m2-external|@w3-m2-lazy|@w3-m3-full|@w3-m3-keyboard|@w3-m3-storage|@w3-m3-corrupt|@w3-m3-parent|@w3-m3-cold|@w3-m3-asset-fault|@w3-m3-narrow|@w3-m3-external|@w3-m3-lazy|@w3-m4-full|@w3-m4-keyboard|@w3-m4-mouse|@w3-m4-storage|@w3-m4-corrupt|@w3-m4-parent|@w3-m4-cold|@w3-m4-asset-fault|@w3-m4-narrow|@w3-m4-external|@w3-m4-lazy|@w4-m1-(?:full|keyboard|mouse|touch|storage|corrupt|parent|work|python-security|cold|asset-fault|narrow|external|lazy|runtime-fault)|@w4-m2-(?:full|keyboard|mouse|touch|accessibility|storage|corrupt|parent|work|python-security|cold|runtime-fault|asset-fault|narrow|external|lazy)|@w3-m5/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1024 } },
    },
    {
      name: 'tablet-webkit-768x1024',
      grep: /@week-one-system|@legacy|@full|@parity|@corrupt-smoke|@cold|@staff-full|@staff-parity|@staff-corrupt|@staff-cold|@regalia-full|@regalia-parity|@regalia-corrupt|@regalia-cold|@advanced-full|@advanced-parity|@advanced-corrupt|@advanced-cold|@advanced-asset-fault|@horse-full|@horse-corrupt|@horse-cold|@horse-asset-fault|@monkey-full|@monkey-corrupt|@monkey-cold|@monkey-asset-fault|@peach-full|@peach-corrupt|@peach-cold|@peach-asset-fault|@furnace-full|@furnace-cold|@w3-m1-full|@w3-m1-cold|@w3-m2-full|@w3-m2-cold|@w3-m3-full|@w3-m3-cold|@w3-m4-full|@w3-m4-cold|@w3-m5-full|@w3-m5-cold|@w4-m1-full|@w4-m2-(?:full|cold|asset-fault|runtime-fault)/,
      use: { browserName: 'webkit', viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'mobile-chromium-390x844',
      grep: /@week-one-system|@legacy|@full|@parity|@cold|@staff-full|@staff-parity|@staff-cold|@regalia-full|@regalia-parity|@regalia-cold|@regalia-narrow|@advanced-full|@advanced-parity|@advanced-cold|@advanced-narrow|@advanced-asset-fault|@horse-full|@horse-cold|@monkey-full|@monkey-cold|@peach-full|@peach-cold|@furnace-full|@furnace-cold|@w3-m1-full|@w3-m1-cold|@w3-m1-narrow|@w3-m2-full|@w3-m2-cold|@w3-m3-full|@w3-m3-cold|@w3-m4-full|@w3-m4-touch|@w3-m4-cold|@w3-m5-full|@w3-m5-touch|@w3-m5-cold|@w4-m1-full|@w4-m1-touch|@w4-m2-(?:full|touch|cold)/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'desktop-firefox-1440x1024',
      grep: /@week-one-system|@legacy|@full|@keyboard|@corrupt-smoke|@cold|@staff-full|@staff-keyboard|@staff-corrupt|@staff-cold|@regalia-full|@regalia-keyboard|@regalia-corrupt|@regalia-cold|@advanced-full|@advanced-keyboard|@advanced-corrupt|@advanced-cold|@advanced-asset-fault|@horse-full|@horse-keyboard|@horse-cold|@monkey-full|@monkey-keyboard|@monkey-corrupt|@monkey-cold|@peach-full|@peach-keyboard|@peach-corrupt|@peach-cold|@furnace-full|@furnace-keyboard|@furnace-cold|@boss-keyboard|@w3-m1-full|@w3-m1-cold|@w3-m1-keyboard|@w3-m2-full|@w3-m2-cold|@w3-m2-keyboard|@w3-m3-full|@w3-m3-keyboard|@w3-m3-cold|@w3-m4-full|@w3-m4-keyboard|@w3-m4-cold|@w3-m5-full|@w3-m5-keyboard|@w3-m5-cold|@w4-m1-full|@w4-m1-keyboard|@w4-m2-(?:full|keyboard|cold)/,
      use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 1024 } },
    },
    {
      name: 'narrow-chromium-320x844',
      grep: /@week-one-system|@legacy|@narrow|@cold|@staff-full|@staff-cold|@regalia-full|@regalia-narrow|@regalia-cold|@advanced-full|@advanced-narrow|@advanced-cold|@advanced-asset-fault|@horse-full|@horse-cold|@monkey-full|@monkey-cold|@peach-full|@peach-cold|@furnace-full|@furnace-cold|@w3-m1-full|@w3-m1-cold|@w3-m1-narrow|@w3-m2-full|@w3-m2-cold|@w3-m2-narrow|@w3-m3-full|@w3-m3-cold|@w3-m3-narrow|@w3-m4-full|@w3-m4-touch|@w3-m4-cold|@w3-m4-narrow|@w3-m5-full|@w3-m5-touch|@w3-m5-narrow|@w3-m5-cold|@w4-m1-full|@w4-m1-touch|@w4-m1-narrow|@w4-m2-(?:full|touch|narrow|cold)/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
});
