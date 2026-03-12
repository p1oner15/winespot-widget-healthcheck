// @ts-check
const { test, expect } = require('../fixtures');
const config = require('../config');
const { performChatScenario } = require('../widget.helper');

const partners = config.partners;

partners.forEach((partner) => {
  test.describe(`Partner: ${partner.name}`, () => {
    test.describe.configure({ timeout: config.TEST_TIMEOUT });

    test.beforeEach(async ({ page }) => {
      // Увеличенный таймаут для мобильных устройств и медленных соединений
      const gotoTimeout = config.TIMEOUTS.WIDGET;
      await page.goto(partner.url, {
        waitUntil: 'domcontentloaded',
        timeout: gotoTimeout
      });
    });

    /**
     * Полноценный E2E тест:
     * 1. Виджет отображается
     * 2. Чат открывается
     * 3. Можно отправить сообщение "hello"
     * 4. Бот отвечает
     */
    test('должен открывать чат и отвечать на сообщение hello', async ({ page }) => {
      await performChatScenario(page);
    });
  });
});
