// @ts-check
const config = require('./config');

/**
 * @typedef {Object} WidgetValidationResult
 * @property {boolean} isValid - true если виджет прошёл все проверки
 * @property {string[]} errors - Массив сообщений об ошибках валидации
 * @property {Object} [boundingBox] - Размеры и положение виджета (если успешен)
 */

// =============================================================================
// ВАЛИДАЦИЯ ВИДЖЕТА
// =============================================================================

/**
 * Валидирует виджет: наличие iframe, стили, размеры, положение
 * 
 * @param {import('@playwright/test').Page} page - Страница Playwright
 * @param {number} index - Индекс виджета (если на странице несколько iframe #winespot)
 * @returns {Promise<WidgetValidationResult>} Результат валидации
 */
async function validateWidget(page, index = 0) {
  const result = {
    isValid: false,
    errors: [],
    boundingBox: null
  };

  const widget = page.locator(config.selectors.WIDGET).nth(index);

  // ---------------------------------------------------------------------------
  // Проверка 1: Элемент существует и это iframe
  // ---------------------------------------------------------------------------
  const tagName = await widget.evaluate(el => el.tagName).catch(() => null);
  if (!tagName) {
    result.errors.push('Widget element not found in DOM');
    return result;
  }
  if (tagName !== 'IFRAME') {
    result.errors.push(`Widget is not an iframe, found: ${tagName}`);
    return result;
  }

  // ---------------------------------------------------------------------------
  // Проверка 2: Видимость через CSS-свойства
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Проверка 3: Размеры виджета
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Проверка 4: Положение в viewport (виджет должен быть полностью виден)
  // ---------------------------------------------------------------------------
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

  // Все проверки пройдены
  result.isValid = true;
  return result;
}

// =============================================================================
// РАБОТА С IFRAME ВИДЖЕТА
// =============================================================================

/**
 * Ожидает появления виджета и возвращает frameLocator для работы с iframe
 * 
 * @param {import('@playwright/test').Page} page - Страница Playwright
 * @returns {Promise<import('@playwright/test').FrameLocator>} FrameLocator для работы с содержимым iframe
 */
async function getWidgetFrame(page) {
  // Ждём появления iframe виджета в DOM
  await page.waitForSelector(config.selectors.WIDGET, {
    state: 'attached',
    timeout: config.TIMEOUTS.WIDGET
  });

  // Возвращаем frameLocator — это специальный тип Playwright для работы с iframe
  return page.frameLocator(config.selectors.WIDGET);
}

/**
 * Ожидает загрузки содержимого iframe
 * 
 * @param {import('@playwright/test').FrameLocator} frameLocator - FrameLocator от getWidgetFrame()
 * @returns {Promise<void>}
 */
async function waitForFrameContent(frameLocator) {
  // Ждём появления body внутри iframe — это значит, что содержимое загрузилось
  await frameLocator.locator('body').waitFor({
    state: 'attached',
    timeout: config.TIMEOUTS.FRAME_CONTENT
  });
}

// =============================================================================
// ОТКРЫТИЕ ЧАТА ЧЕРЕЗ МЕДАЛЬКУ
// =============================================================================

/**
 * Открывает чат через медальку, если кнопка Track не видима
 * 
 * Медалька — это маленький iframe (#wsf_medal), который появляется поверх виджета
 * и позволяет открыть чат кликом по иконке
 * 
 * @param {import('@playwright/test').Page} page - Страница Playwright
 * @param {import('@playwright/test').FrameLocator} widgetFrame - FrameLocator основного виджета
 * @returns {Promise<void>}
 */
async function openChatViaMedal(page, widgetFrame) {
  // Получаем frameLocator для медальки
  const medalFrame = page.frameLocator(config.selectors.MEDAL);

  // Ждём загрузки содержимого iframe медальки
  await waitForFrameContent(medalFrame);

  // Кликаем по медальке для открытия чата
  // force: true — кликаем без проверки видимости (медалька может быть под виджетом)
  await medalFrame.locator(config.selectors.MEDAL_FACE).click({ force: true });

  // Ждём появления кнопки Track после открытия чата
  const trackButton = widgetFrame.locator(config.selectors.TRACK_BUTTON).first();
  await trackButton.waitFor({ state: 'visible', timeout: config.TIMEOUTS.TRACK_BUTTON });
}

// =============================================================================
// ОТКРЫТИЕ ЧАТА И КЛИК ПО КНОПКЕ TRACK
// =============================================================================

/**
 * Открывает чат и нажимает кнопку "Track and manage my orders"
 * 
 * @param {import('@playwright/test').Page} page - Страница Playwright
 * @returns {Promise<import('@playwright/test').FrameLocator>} FrameLocator виджета после клика
 */
async function openChatAndClickTrack(page) {
  // Получаем frameLocator виджета
  const widgetFrame = await getWidgetFrame(page);
  
  // Ждём загрузки содержимого iframe
  await waitForFrameContent(widgetFrame);

  // Находим кнопку Track по селектору
  const trackButton = widgetFrame.locator(config.selectors.TRACK_BUTTON).first();

  // Проверяем видимость кнопки
  const isTrackVisible = await trackButton.isVisible().catch(() => false);

  // Если кнопка скрыта — открываем чат через медальку
  if (!isTrackVisible) {
    await openChatViaMedal(page, widgetFrame);
  }

  // Кликаем на кнопку Track
  // force: true — кликаем без дополнительных проверок (мы уже проверили видимость)
  await trackButton.click({ force: true });

  return widgetFrame;
}

// =============================================================================
// ОЖИДАНИЕ ФОРМЫ АВТОРИЗАЦИИ
// =============================================================================

/**
 * Ожидает появления формы авторизации после клика на Track
 * 
 * После клика на Track виджет должен показать форму входа с полем email
 * 
 * @param {import('@playwright/test').FrameLocator} widgetFrame - FrameLocator виджета
 * @returns {Promise<void>}
 */
async function waitForAuthorizationForm(widgetFrame) {
  // Ждём появления поля email (форма авторизации)
  // name поля содержит placeholder "johndoe@email.com"
  const emailField = widgetFrame.getByRole('textbox', { name: config.selectors.EMAIL_FIELD_NAME });
  await emailField.waitFor({ state: 'visible', timeout: config.TIMEOUTS.AUTHORIZATION_FORM });
}

// =============================================================================
// E2E СЦЕНАРИЙ: ПОЛНЫЙ ТЕСТ
// =============================================================================

/**
 * Полный e2e сценарий: открытие чата, клик Track, ожидание формы авторизации
 * 
 * @param {import('@playwright/test').Page} page - Страница Playwright
 * @returns {Promise<void>}
 */
async function performTrackScenario(page) {
  const widgetFrame = await openChatAndClickTrack(page);
  await waitForAuthorizationForm(widgetFrame);
}

// =============================================================================
// ПРОВЕРКА ВИДИМОСТИ ВИДЖЕТА
// =============================================================================

/**
 * Проверяет наличие и валидность всех виджетов на странице
 * 
 * Использует Playwright assertions для автоматического падения теста
 * Если виджет не найден или не прошёл валидацию — тест упадёт с понятной ошибкой
 * 
 * @param {import('@playwright/test').Page} page - Страница Playwright
 * @returns {Promise<void>} Бросает ошибку если виджет не прошёл проверку
 */
async function expectWidgetsVisible(page) {
  const { expect } = require('@playwright/test');

  // Получаем локатор для всех виджетов
  const widgetLocator = page.locator(config.selectors.WIDGET);
  
  // Ожидаем хотя бы один виджет, но не больше ожидаемого количества
  // EXPECTED_IFRAME_COUNT = 2 (основной виджет + медалька)
  await expect(widgetLocator).toHaveCount({ min: 1, max: config.EXPECTED_IFRAME_COUNT });

  // Проверяем видимость первого виджета через Playwright assertion
  // Эта проверка УПАДЁТ если виджет невидим (в отличие от isVisible())
  await expect(widgetLocator.first()).toBeVisible({ timeout: config.TIMEOUTS.WIDGET });

  // Проверяем position: fixed — виджет должен быть зафиксирован
  const position = await widgetLocator.first().evaluate(el =>
    window.getComputedStyle(el).position
  );
  expect(position, 'Widget lost fixed positioning').toBe('fixed');

  // Проверяем валидность виджета (размеры, положение в viewport)
  const result = await validateWidget(page, 0);
  if (!result.isValid) {
    throw new Error(`Widget validation failed: ${result.errors.join('; ')}`);
  }
}

// =============================================================================
// ЭКСПОРТ ФУНКЦИЙ
// =============================================================================

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
