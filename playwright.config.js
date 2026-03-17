// @ts-check
import { defineConfig, devices } from '@playwright/test';

const testConfig = require('./tests/config');

/**
 * Конфигурация Playwright для тестов виджета WineSpot
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/debug-*.spec.js'],

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  reporter: 'html',
  timeout: testConfig.TEST_TIMEOUT,

  use: {
    baseURL: 'https://staging.getwinespot.com/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },

    {
      name: 'Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },

    // Safari работает только на macOS
    // На Windows падает — это нормально (в CI запускается на macOS-раннере)
    {
      name: 'Safari',
      use: { ...devices['Desktop Safari'] },
      retries: 3,  // Safari медленнее, даём больше попыток
    },

    // Мобильные браузеры — важны для аудитории 45-50+ (растущий сегмент)
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13'] },
      retries: 5,  // Мобильные тесты могут быть менее стабильны
    },

    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
