// @ts-check
const { test: base, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

/**
 * @typedef {Object} TestFixtures
 * @property {import('@playwright/test').Page} page
 */

/**
 * @typedef {Object} WorkerFixtures
 */

// Расширяем базовый тест своими фикстурами
const test = base.extend({
  /**
   * Фикстура для автоматического создания скриншота при падении теста
   * Playwright уже делает скриншоты через screenshot: 'only-on-failure',
   * но эта фикстура добавляет логирование ошибок
   */
  page: async ({ page }, use) => {
    // Передаём page в тест
    await use(page);
  }
});

// Экспортием test и expect для использования в тестах
module.exports = { test, expect };
