// @ts-check
const { test: base, expect } = require('@playwright/test');
const path = require('path');

/**
 * @typedef {Object} TestFixtures
 * @property {import('@playwright/test').Page} page
 */

// =============================================================================
// РАСШИРЕНИЕ ФИКСТУР PLAYWRIGHT
// =============================================================================

/**
 * Расширяем базовый тест своими фикстурами
 * Playwright позволяет переопределять стандартные фикстуры (например, page)
 * и добавлять собственную логику
 */
const test = base.extend({
  /**
   * Фикстура page с автоматическим созданием скриншота при падении теста
   * 
   * Playwright уже делает скриншоты через screenshot: 'only-on-failure' в конфиге,
   * но эта фикстура дополнительно:
   * - Сохраняет скриншот в удобную папку screenshots/
   * - Логирует путь к скриншоту в консоль
   * - Использует timestamp в имени файла для уникальности
   * 
   * @param {import('@playwright/test').Page} page - Стандартный page от Playwright
   * @param {Function} use - Функция для передачи page в тест
   */
  page: async ({ page }, use) => {
    try {
      // Передаём page в тест — выполняется основной код теста
      await use(page);
    } catch (error) {
      // =======================================================================
      // Обработка падения теста
      // =======================================================================
      try {
        // Создаём директорию для скриншотов, если не существует
        const screenshotDir = path.resolve(__dirname, '../screenshots');
        const fs = require('fs');
        if (!fs.existsSync(screenshotDir)) {
          fs.mkdirSync(screenshotDir, { recursive: true });
        }
        
        // Генерируем уникальное имя файла с timestamp
        const timestamp = Date.now();
        const screenshotPath = path.join(screenshotDir, `fail_${timestamp}.png`);
        
        // Делаем полностраничный скриншот
        await page.screenshot({ path: screenshotPath, fullPage: true });
        
        // Логируем путь к скриншоту для удобства отладки
        console.error(`Screenshot saved: ${screenshotPath}`);
      } catch (screenshotError) {
        // Если не удалось сделать скриншот — логируем ошибку, но не прерываем тест
        console.error('Failed to save screenshot:', screenshotError.message);
      }
      
      // Пробрасываем оригинальную ошибку дальше — тест упадёт
      throw error;
    }
  }
});

// =============================================================================
// ЭКСПОРТ
// =============================================================================

/**
 * Экспортируем test и expect для использования в тестах
 * 
 * Пример использования в тесте:
 * const { test, expect } = require('../fixtures');
 * 
 * test('мой тест', async ({ page }) => {
 *   await page.goto('https://example.com');
 *   // ...
 * });
 */
module.exports = { test, expect };
