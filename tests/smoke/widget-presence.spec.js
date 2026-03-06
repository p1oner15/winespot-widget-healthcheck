// @ts-check
const { test, expect } = require('../fixtures');
const config = require('../config');
const { expectWidgetsVisible } = require('../widget.helper');

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

    /**
     * Быстрая проверка наличия виджета:
     * - Виджет найден в DOM (iframe #winespot)
     * - Виджет видим (display !== 'none', visibility !== 'hidden')
     * - position: fixed
     * - Размеры больше минимальных (> 30px)
     * - Виджет в пределах viewport
     * 
     * Запускайте отдельно для быстрой проверки:
     *   npx playwright test --grep "presence"
     */
    test('должен отображать виджет (presence check)', async ({ page }) => {
      await expectWidgetsVisible(page);
    });
  });
});
