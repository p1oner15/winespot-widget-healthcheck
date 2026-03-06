// @ts-check
const { test: base, expect } = require('@playwright/test');
const path = require('path');

/**
 * Расширяем базовый тест своими фикстурами
 */
const test = base.extend({
  /**
   * Фикстура page с автоскриншотом при падении теста
   * Playwright делает скриншоты через screenshot: 'only-on-failure',
   * но эта фикстура дополнительно сохраняет их в screenshots/
   */
  page: async ({ page }, use) => {
    try {
      await use(page);
    } catch (error) {
      try {
        const screenshotDir = path.resolve(__dirname, '../screenshots');
        const fs = require('fs');
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }

        const timestamp = Date.now();
        const screenshotPath = path.join(screenshotDir, `fail_${timestamp}.png`);

        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.error(`Screenshot saved: ${screenshotPath}`);
      } catch (screenshotError) {
        console.error('Failed to save screenshot:', screenshotError.message);
      }

      throw error;
    }
  }
});

module.exports = { test, expect };
