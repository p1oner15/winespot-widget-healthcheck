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
// ОТКРЫТИЕ ЧАТА И ОТПРАВКА СООБЩЕНИЯ
// =============================================================================

/**
 * Открывает чат и отправляет сообщение "hello", ждёт ответа
 *
 * Структура виджета:
 * - .chat.-hello — начальный экран с "Click here to start using our beta chat!"
 * - .chat.-welc — приветственный экран с темами
 * - .chat.-messages — чат с полем ввода и кнопкой отправки
 *
 * @param {import('@playwright/test').Page} page - Страница Playwright
 * @returns {Promise<void>}
 */
async function performChatScenario(page) {
  const { expect } = require('@playwright/test');
  
  // Получаем frameLocator для виджета
  const widgetFrame = page.frameLocator('#winespot');
  
  // Ждём загрузки содержимого iframe виджета
  await waitForFrameContent(widgetFrame);

  // Кликаем по "Click here to start using our beta chat!" чтобы открыть чат
  // Это открывает приветственный экран
  try {
    const openChatButton = widgetFrame.locator('.ws_open_welc').first();
    await openChatButton.click({ force: true });
    await page.waitForTimeout(500); // Ждём открытия
  } catch (error) {
    console.log('ws_open_welc click failed, continuing anyway...');
  }

  // Теперь кликаем по "How can we help?" чтобы открыть поле ввода
  // Это элемент .w_link_msg с open_chat=""
  try {
    const openMessagesButton = widgetFrame.locator('[open_chat=""]').first();
    await openMessagesButton.click({ force: true });
    await page.waitForTimeout(500); // Ждём открытия
  } catch (error) {
    console.log('open_chat click failed, continuing anyway...');
  }

  // Ищем поле ввода сообщения (contenteditable div)
  const messageInput = widgetFrame.locator('#ws_input, [contenteditable="true"]').first();
  
  // Вводим сообщение "hello"
  await messageInput.fill('hello');
  
  // Кликаем кнопку отправки
  const sendButton = widgetFrame.locator('#ws_bsend, .btn.send').first();
  await sendButton.click();
  
  // Ждём ответа от бота
  // Структура сообщений:
  // <div class="itm msg -guest">...</div> — сообщение пользователя
  // <div class="itm msg -mngr">...</div> — сообщение бота (manager)
  
  // Ждём сообщение от бота (класс -mngr)
  const botMessage = widgetFrame.locator('#ws_msgcont .itm.msg.-mngr');
  
  // Ждём хотя бы одно сообщение от бота
  await expect(botMessage.first()).toBeVisible({ timeout: config.TIMEOUTS.AUTHORIZATION_FORM * 2 });
  
  // Дополнительно проверяем что в сообщении есть текст (в balloon элементе)
  const botMessageText = botMessage.first().locator('.bal').first();
  await expect(botMessageText).toBeVisible({ timeout: config.TIMEOUTS.AUTHORIZATION_FORM });
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

  // Ожидаем хотя бы один виджет (ждем появления в DOM)
  await expect(widgetLocator).toHaveCount(1, { timeout: config.TIMEOUTS.WIDGET });
  
  // Проверяем, что виджетов не больше ожидаемого количества
  // EXPECTED_IFRAME_COUNT = 2 (основной виджет + медалька)
  const count = await widgetLocator.count();
  expect(count).toBeLessThanOrEqual(config.EXPECTED_IFRAME_COUNT);

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
  performChatScenario,
  expectWidgetsVisible
};
