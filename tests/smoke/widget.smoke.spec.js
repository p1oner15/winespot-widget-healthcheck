// @ts-check
const { test, expect } = require('../fixtures');
const config = require('../config');
const { expectWidgetsVisible, performTrackScenario } = require('../widget.helper');

const partners = config.partners;

partners.forEach((partner) => {
  test.describe(`Partner: ${partner.name}`, () => {
    test.describe.configure({ timeout: config.TEST_TIMEOUT });

    test.beforeEach(async ({ page }) => {
      await page.goto(partner.url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
    });

    test('должен отображать виджет корректно', async ({ page }) => {
      await expectWidgetsVisible(page);
    });

    test('должен открывать чат и переходить на форму авторизации по кнопке Track', async ({ page }) => {
      // Проверяем видимость виджета
      await expectWidgetsVisible(page);
      
      // Открываем чат и нажимаем Track, ждём форму авторизации
      await performTrackScenario(page);
    });
  });
});
