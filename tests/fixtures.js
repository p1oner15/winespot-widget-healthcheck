// @ts-check
const { test: base, expect } = require('@playwright/test');
const path = require('path');

/**
 * @typedef {Object} TestFixtures
 * @property {import('@playwright/test').Page} page
 */

// Расширяем базовый тест своими фикстурами
const test = base.extend({
  /**
   * Фикстура для автоматического создания скриншота при падении теста
   * Playwright уже делает скриншоты через screenshot: 'only-on-failure',
   * но эта фикстура добавляет скриншот в папку screenshots/ для удобства
   */
  page: async ({ page }, use) => {
    try {
      await use(page);
    } catch (error) {
      // Создаём скриншот при падении теста
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
      
      // Пробрасываем оригинальную ошибку дальше
      throw error;
    }
  }
});

// Экспортируем test и expect для использования в тестах
module.exports = { test, expect };
