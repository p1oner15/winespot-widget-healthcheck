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
 * @param {number} index
 * @returns {Promise<WidgetValidationResult>}
 */
async function validateWidget(page, index = 0) {
  const result = {
    isValid: false,
    errors: [],
    boundingBox: null
  };

  const widget = page.locator(config.selectors.WIDGET).nth(index);

  // Проверка 1: Элемент существует и это iframe
  const tagName = await widget.evaluate(el => el.tagName).catch(() => null);
  if (!tagName) {
    result.errors.push('Widget element not found in DOM');
    return result;
  }
  if (tagName !== 'IFRAME') {
    result.errors.push(`Widget is not an iframe, found: ${tagName}`);
    return result;
  }

  // Проверка 2: Видимость через CSS-свойства
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

  // Проверка 3: Размеры виджета
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

  // Проверка 4: Положение в viewport
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
 * Открывает чат и отправляет сообщение "hello", ждёт ответа
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function performChatScenario(page) {
  const { expect } = require('@playwright/test');

  // Сначала проверяем, что виджет отображается
  await expectWidgetsVisible(page);

  const widgetFrame = page.frameLocator('#winespot');

  await waitForFrameContent(widgetFrame);

  // Кликаем по "Click here to start using our beta chat!"
  try {
    const openChatButton = widgetFrame.locator('.ws_open_welc').first();
    await openChatButton.click({ force: true });
    await widgetFrame.locator('[open_chat=""]').waitFor({ state: 'visible', timeout: 10000 });
  } catch (error) {
    // Игнорируем ошибку — возможно, чат уже открыт
  }

  // Кликаем по "How can we help?" для открытия поля ввода
  try {
    const openMessagesButton = widgetFrame.locator('[open_chat=""]').first();
    await openMessagesButton.click({ force: true });
    await widgetFrame.locator('#ws_input, [contenteditable="true"]').waitFor({ state: 'visible', timeout: 10000 });
  } catch (error) {
    // Игнорируем ошибку — возможно, поле уже доступно
  }

  // Вводим сообщение "hello"
  const messageInput = widgetFrame.locator('#ws_input, [contenteditable="true"]').first();
  await messageInput.fill('hello');

  // Отправляем сообщение
  const sendButton = widgetFrame.locator('#ws_bsend, .btn.send').first();
  await sendButton.click();

  // Ждём ответа от бота
  // Структура: <div class="itm msg -mngr"><div class="bal">TEXT</div></div>
  const botMessage = widgetFrame.locator('#ws_msgcont .itm.msg.-mngr');
  
  // Ждём появления контейнера сообщения
  await expect(botMessage.first()).toBeVisible({ timeout: config.TIMEOUTS.CHAT_RESPONSE });

  // Ждём, пока исчезнет индикатор набора (если есть)
  const typingIndicator = widgetFrame.locator('.ws_typing, .typing');
  try {
    await typingIndicator.first().waitFor({ state: 'detached', timeout: 10000 });
  } catch (e) {
    // Игнорируем — индикатор может отсутствовать
  }

  // Ждём, пока текст в .bal станет непустым
  // Элемент .bal появляется сразу, но текст внутри может подгружаться позже
  await expect(async () => {
    const botText = await botMessage.first().locator('.bal').textContent();
    const trimmedText = botText?.trim();
    if (!trimmedText || trimmedText.length === 0) {
      throw new Error('Bot text is empty');
    }
  }).toPass({ timeout: config.TIMEOUTS.CHAT_RESPONSE });

  // Проверяем, что бот действительно ответил (текст не пустой)
  const botMessageText = botMessage.first().locator('.bal').first();
  const botTextContent = await botMessageText.textContent();
  expect(botTextContent?.trim().length ?? 0).toBeGreaterThan(0, 'Bot response is empty');
}

/**
 * Проверяет наличие и валидность всех виджетов на странице
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function expectWidgetsVisible(page) {
  const { expect } = require('@playwright/test');

  const widgetLocator = page.locator(config.selectors.WIDGET);

  await expect(widgetLocator).toHaveCount(1, { timeout: config.TIMEOUTS.WIDGET });

  const count = await widgetLocator.count();
  expect(count).toBeLessThanOrEqual(config.EXPECTED_IFRAME_COUNT);

  await expect(widgetLocator.first()).toBeVisible({ timeout: config.TIMEOUTS.WIDGET });

  const position = await widgetLocator.first().evaluate(el =>
    window.getComputedStyle(el).position
  );
  expect(position, 'Widget lost fixed positioning').toBe('fixed');

  const result = await validateWidget(page, 0);
  if (!result.isValid) {
    throw new Error(`Widget validation failed: ${result.errors.join('; ')}`);
  }
}

module.exports = {
  validateWidget,
  getWidgetFrame,
  waitForFrameContent,
  performChatScenario,
  expectWidgetsVisible
};
