// @ts-check
const { test, expect } = require('./fixtures');
const config = require('./config');
const {
  validateWidget,
  expectWidgetsVisible,
  performTrackScenario,
  getWidgetFrame
} = require('./widget.helper');

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
      await test.step('Load page', async () => {
        // Страница уже загружена в beforeEach
      });

      await test.step('Validate widget', async () => {
        await expectWidgetsVisible(page);

        // Дополнительная явная проверка position: fixed с понятным сообщением
        const widget = page.locator(config.selectors.WIDGET).first();
        const position = await widget.evaluate(el =>
          window.getComputedStyle(el).position
        );
        expect(position, 'Widget lost fixed positioning').toBe('fixed');
      });
    });

    test('должен открывать чат и переходить на форму авторизации по кнопке Track', async ({ page }) => {
      await test.step('Load page', async () => {
        // Страница уже загружена в beforeEach
      });

      await test.step('Validate widget', async () => {
        await expectWidgetsVisible(page);
      });

      await test.step('Open chat', async () => {
        // performTrackScenario internally waits for chat to open
      });

      await test.step('Click Track', async () => {
        // performTrackScenario internally clicks Track button
      });

      await test.step('Validate authorization screen', async () => {
        await performTrackScenario(page);
      });
    });
  });
});
