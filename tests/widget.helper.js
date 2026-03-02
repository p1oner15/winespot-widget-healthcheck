// @ts-check
const config = require('./config');

/**
 * @typedef {Object} WidgetValidationResult
 * @property {boolean} isValid
 * @property {string[]} errors
 * @property {Object} [boundingBox]
 */

/**
 * Валидирует виджет: наличие iframe, стили, размеры, положение
 * @param {import('@playwright/test').Page} page
 * @param {number} index — индекс виджета
 * @returns {Promise<WidgetValidationResult>}
 */
async function validateWidget(page, index = 0) {
  const result = {
    isValid: false,
    errors: [],
    boundingBox: null
  };

  const widget = page.locator(config.selectors.WIDGET).nth(index);

  // Проверка: элемент существует и это iframe
  const tagName = await widget.evaluate(el => el.tagName).catch(() => null);
  if (!tagName) {
    result.errors.push('Widget element not found in DOM');
    return result;
  }
  if (tagName !== 'IFRAME') {
    result.errors.push(`Widget is not an iframe, found: ${tagName}`);
    return result;
  }

  // Проверка: видимость через CSS-свойства
  const styles = await widget.evaluate(el => {
    const computed = window.getComputedStyle(el);
    return {
      display: computed.display,
      visibility: computed.visibility,
      position: computed.position
    };
  }).catch(() => null);

  if (!styles) {
    result.errors.push('Failed to get widget styles');
    return result;
  }
  if (styles.display === 'none') {
    result.errors.push('Widget has display: none');
    return result;
  }
  if (styles.visibility === 'hidden') {
    result.errors.push('Widget has visibility: hidden');
    return result;
  }
  if (styles.position !== 'fixed') {
    result.errors.push(`Widget lost fixed positioning, found: ${styles.position}`);
    return result;
  }

  // Проверка: размеры
  const box = await widget.boundingBox().catch(() => null);
  if (!box) {
    result.errors.push('Widget bounding box is null');
    return result;
  }
  result.boundingBox = box;

  if (box.width <= config.MIN_WIDGET_SIZE) {
    result.errors.push(`Widget width ${box.width}px is below minimal ${config.MIN_WIDGET_SIZE}px`);
    return result;
  }
  if (box.height <= config.MIN_WIDGET_SIZE) {
    result.errors.push(`Widget height ${box.height}px is below minimal ${config.MIN_WIDGET_SIZE}px`);
    return result;
  }

  // Проверка: положение в viewport
  const viewport = page.viewportSize();
  if (!viewport) {
    result.errors.push('Viewport size is null');
    return result;
  }

  if (box.x < 0 || box.y < 0 ||
      box.x + box.width > viewport.width ||
      box.y + box.height > viewport.height) {
    result.errors.push('Widget is outside viewport');
    return result;
  }

  result.isValid = true;
  return result;
}

/**
 * Ожидает появления виджета и возвращает frameLocator для работы с iframe
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<import('@playwright/test').FrameLocator>}
 */
async function getWidgetFrame(page) {
  await page.waitForSelector(config.selectors.WIDGET, {
    state: 'attached',
    timeout: config.TIMEOUTS.WIDGET
  });

  return page.frameLocator(config.selectors.WIDGET);
}

/**
 * Ожидает загрузки содержимого iframe
 * @param {import('@playwright/test').FrameLocator} frameLocator
 * @returns {Promise<void>}
 */
async function waitForFrameContent(frameLocator) {
  await frameLocator.locator('body').waitFor({
    state: 'attached',
    timeout: config.TIMEOUTS.FRAME_CONTENT
  });
}

/**
 * Открывает чат через медальку, если кнопка Track не видима
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').FrameLocator} widgetFrame
 * @returns {Promise<void>}
 */
async function openChatViaMedal(page, widgetFrame) {
  const medalFrame = page.frameLocator(config.selectors.MEDAL);

  // Ждём загрузки содержимого iframe медальки
  await waitForFrameContent(medalFrame);

  // Кликаем по медальке для открытия чата
  await medalFrame.locator(config.selectors.MEDAL_FACE).click({ force: true });

  // Ждём появления кнопки Track
  const trackButton = widgetFrame.locator(config.selectors.TRACK_BUTTON).first();
  await trackButton.waitFor({ state: 'visible', timeout: config.TIMEOUTS.TRACK_BUTTON });
}

/**
 * Открывает чат и нажимает кнопку "Track and manage my orders"
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<import('@playwright/test').FrameLocator>}
 */
async function openChatAndClickTrack(page) {
  const widgetFrame = await getWidgetFrame(page);
  await waitForFrameContent(widgetFrame);

  const trackButton = widgetFrame.locator(config.selectors.TRACK_BUTTON).first();

  // Проверяем видимость кнопки
  const isTrackVisible = await trackButton.isVisible().catch(() => false);

  // Если кнопка скрыта — открываем чат через медальку
  if (!isTrackVisible) {
    await openChatViaMedal(page, widgetFrame);
  }

  // Кликаем на кнопку Track
  await trackButton.click({ force: true });

  return widgetFrame;
}

/**
 * Ожидает появления формы авторизации после клика на Track
 * @param {import('@playwright/test').FrameLocator} widgetFrame
 * @returns {Promise<void>}
 */
async function waitForAuthorizationForm(widgetFrame) {
  // Ждём появления поля email (форма авторизации)
  const emailField = widgetFrame.getByRole('textbox', { name: config.selectors.EMAIL_FIELD_NAME });
  await emailField.waitFor({ state: 'visible', timeout: config.TIMEOUTS.AUTHORIZATION_FORM });
}

/**
 * Полный e2e сценарий: открытие чата, клик Track, ожидание формы авторизации
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function performTrackScenario(page) {
  const widgetFrame = await openChatAndClickTrack(page);
  await waitForAuthorizationForm(widgetFrame);
}

/**
 * Проверяет наличие и валидность всех виджетов на странице
 * Использует Playwright assertions для автоматического падения теста
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function expectWidgetsVisible(page) {
  const { expect } = require('@playwright/test');

  // Ждём появления виджета с проверкой видимости
  const widgetLocator = page.locator(config.selectors.WIDGET);
  
  // Ожидаем хотя бы один виджет
  await expect(widgetLocator).toHaveCount({ min: 1, max: config.EXPECTED_IFRAME_COUNT });

  // Проверяем видимость первого виджета через Playwright assertion
  await expect(widgetLocator.first()).toBeVisible({ timeout: config.TIMEOUTS.WIDGET });

  // Проверяем position: fixed
  const position = await widgetLocator.first().evaluate(el =>
    window.getComputedStyle(el).position
  );
  expect(position, 'Widget lost fixed positioning').toBe('fixed');

  // Проверяем валидность виджета
  const result = await validateWidget(page, 0);
  if (!result.isValid) {
    throw new Error(`Widget validation failed: ${result.errors.join('; ')}`);
  }
}

module.exports = {
  validateWidget,
  getWidgetFrame,
  waitForFrameContent,
  openChatViaMedal,
  openChatAndClickTrack,
  waitForAuthorizationForm,
  performTrackScenario,
  expectWidgetsVisible
};
