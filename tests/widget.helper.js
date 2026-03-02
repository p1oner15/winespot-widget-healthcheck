// @ts-check
const config = require('./config');

/**
 * @typedef {Object} WidgetValidationResult
 * @property {boolean} isValid
 * @property {string[]} errors
 * @property {Object} [boundingBox]
 */

/**
 * Проверяет, что виджет находится в пределах viewport
 * @param {{ x: number, y: number, width: number, height: number }} box
 * @param {{ width: number, height: number }} viewport
 * @returns {{ isValid: boolean, error: string | null }}
 */
function validateWidgetPosition(box, viewport) {
  const errors = [];

  if (box.x < 0) {
    errors.push(`Widget is outside viewport on left by ${Math.abs(box.x)}px`);
  }
  if (box.y < 0) {
    errors.push(`Widget is outside viewport on top by ${Math.abs(box.y)}px`);
  }
  if (box.x + box.width > viewport.width) {
    errors.push(`Widget is outside viewport on right by ${box.x + box.width - viewport.width}px`);
  }
  if (box.y + box.height > viewport.height) {
    errors.push(`Widget is outside viewport on bottom by ${box.y + box.height - viewport.height}px`);
  }

  return {
    isValid: errors.length === 0,
    error: errors.length > 0 ? errors.join('; ') : null
  };
}

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
  try {
    const tagName = await widget.evaluate(el => el.tagName, { timeout: config.TIMEOUTS.ELEMENT });
    if (tagName !== 'IFRAME') {
      const errorMsg = `Widget is not an iframe, found: ${tagName}`;
      result.errors.push(errorMsg);
      console.log(`[Widget Validation] ${errorMsg}`);
      return result;
    }
  } catch (error) {
    const errorMsg = 'Widget element not found in DOM';
    result.errors.push(errorMsg);
    console.log(`[Widget Validation] ${errorMsg}`);
    return result;
  }

  // Проверка: видимость через CSS-свойства
  try {
    const styles = await widget.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        display: computed.display,
        visibility: computed.visibility,
        position: computed.position
      };
    });

    if (styles.display === 'none') {
      const errorMsg = 'Widget has display: none';
      result.errors.push(errorMsg);
      console.log(`[Widget Validation] ${errorMsg}`);
    }
    if (styles.visibility === 'hidden') {
      const errorMsg = 'Widget has visibility: hidden';
      result.errors.push(errorMsg);
      console.log(`[Widget Validation] ${errorMsg}`);
    }
    if (styles.position !== 'fixed') {
      const errorMsg = `Widget lost fixed positioning, found: ${styles.position}`;
      result.errors.push(errorMsg);
      console.log(`[Widget Validation] ${errorMsg}`);
    }

    if (result.errors.length > 0) {
      return result;
    }
  } catch (error) {
    const errorMsg = 'Failed to get widget styles';
    result.errors.push(errorMsg);
    console.log(`[Widget Validation] ${errorMsg}`);
    return result;
  }

  // Проверка: размеры
  try {
    const box = await widget.boundingBox();
    if (!box) {
      const errorMsg = 'Widget bounding box is null';
      result.errors.push(errorMsg);
      console.log(`[Widget Validation] ${errorMsg}`);
      return result;
    }

    result.boundingBox = box;

    if (box.width <= config.MIN_WIDGET_SIZE) {
      const errorMsg = `Widget size is below minimal threshold: width=${box.width}px (min: ${config.MIN_WIDGET_SIZE}px)`;
      result.errors.push(errorMsg);
      console.log(`[Widget Validation] ${errorMsg}`);
    }
    if (box.height <= config.MIN_WIDGET_SIZE) {
      const errorMsg = `Widget size is below minimal threshold: height=${box.height}px (min: ${config.MIN_WIDGET_SIZE}px)`;
      result.errors.push(errorMsg);
      console.log(`[Widget Validation] ${errorMsg}`);
    }

    if (result.errors.length > 0) {
      return result;
    }

    // Проверка: положение в viewport
    const viewport = page.viewportSize();
    if (!viewport) {
      const errorMsg = 'Viewport size is null';
      result.errors.push(errorMsg);
      console.log(`[Widget Validation] ${errorMsg}`);
      return result;
    }

    const positionValidation = validateWidgetPosition(box, viewport);
    if (!positionValidation.isValid) {
      const errorMsg = `Widget is outside viewport: ${positionValidation.error}`;
      result.errors.push(errorMsg);
      console.log(`[Widget Validation] ${errorMsg}`);
      return result;
    }
  } catch (error) {
    const errorMsg = 'Failed to get widget bounding box';
    result.errors.push(errorMsg);
    console.log(`[Widget Validation] ${errorMsg}`);
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
  // Ждём появления iframe виджета
  await page.waitForSelector(config.selectors.WIDGET, {
    state: 'attached',
    timeout: config.TIMEOUTS.WIDGET
  });

  // Используем frameLocator для стабильной работы с iframe
  return page.frameLocator(config.selectors.WIDGET);
}

/**
 * Ожидает загрузки содержимого iframe
 * @param {import('@playwright/test').FrameLocator} frameLocator
 * @returns {Promise<void>}
 */
async function waitForFrameContent(frameLocator) {
  // Конвертируем FrameLocator в Locator для проверки body
  // Используем locate() для получения элемента внутри iframe
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
  const medalLocator = page.locator(config.selectors.MEDAL);

  // Ждём появления медальки
  await medalLocator.waitFor({ state: 'attached', timeout: config.TIMEOUTS.WIDGET });

  // Получаем frameLocator для медальки
  const medalFrame = page.frameLocator(config.selectors.MEDAL);

  // Ждём загрузки содержимого iframe медальки
  await waitForFrameContent(medalFrame);

  // Кликаем по медальке для открытия чата
  // Используем force: true чтобы избежать проверок видимости (медалька может быть под виджетом)
  await medalFrame.locator(config.selectors.MEDAL_FACE).click({ force: true });

  // Ждём появления кнопки Track после открытия чата
  // Кнопка может появиться с задержкой, используем polling
  const trackButton = widgetFrame.locator(config.selectors.TRACK_BUTTON).first();

  // Пробуем дождаться кнопки с повторными попытками
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await trackButton.waitFor({ state: 'visible', timeout: config.TIMEOUTS.TRACK_BUTTON / maxAttempts });
      
      // Дополнительно проверяем текст кнопки (на случай если селектор нашёл не тот элемент)
      const buttonText = await trackButton.textContent();
      if (buttonText && buttonText.includes(config.selectors.TRACK_BUTTON_TEXT)) {
        break; // Кнопка найдена и текст совпадает
      }
      // Если текст не совпадает — продолжаем ждать
      if (attempt === maxAttempts) {
        throw new Error(`Текст кнопки не совпадает: "${buttonText}" (ожидалось: "${config.selectors.TRACK_BUTTON_TEXT}")`);
      }
    } catch (error) {
      if (attempt === maxAttempts) {
        throw new Error(`Кнопка Track не появилась после ${maxAttempts} попыток: ${error.message}`);
      }
      // Кликаем ещё раз
      await medalFrame.locator(config.selectors.MEDAL_FACE).click({ force: true });
    }
  }
}

/**
 * Открывает чат и нажимает кнопку "Track and manage my orders"
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<import('@playwright/test').FrameLocator>}
 */
async function openChatAndClickTrack(page) {
  // Получаем frameLocator виджета
  const widgetFrame = await getWidgetFrame(page);

  // Ждём загрузки содержимого iframe
  await waitForFrameContent(widgetFrame);

  // Находим кнопку Track по селектору
  const trackButton = widgetFrame.locator(config.selectors.TRACK_BUTTON).first();

  // Проверяем, видима ли кнопка
  const isTrackVisible = await trackButton.isVisible().catch(() => false);

  // Если кнопка скрыта — открываем чат через медальку
  if (!isTrackVisible) {
    await openChatViaMedal(page, widgetFrame);
  } else {
    // Кнопка видима — ждём её готовности к клику и проверяем текст
    await trackButton.waitFor({ state: 'visible', timeout: config.TIMEOUTS.TRACK_BUTTON });
    
    // Проверяем текст кнопки (для логирования и отладки)
    const buttonText = await trackButton.textContent();
    if (!buttonText || !buttonText.includes(config.selectors.TRACK_BUTTON_TEXT)) {
      console.log(`[Warning] Текст кнопки Track: "${buttonText}" (ожидалось: "${config.selectors.TRACK_BUTTON_TEXT}")`);
    }
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
 * Ожидает, пока виджет станет видимым (display !== 'none')
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function waitForWidgetVisible(page) {
  // Ждём, пока виджет перестанет иметь display: none
  await page.waitForFunction(
    (selector) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      return window.getComputedStyle(el).display !== 'none';
    },
    config.selectors.WIDGET,
    { timeout: config.TIMEOUTS.WIDGET }
  );
}

/**
 * Проверяет наличие и валидность всех виджетов на странице
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function expectWidgetsVisible(page) {
  // Ждём появления хотя бы одного виджета
  await page.waitForSelector(config.selectors.WIDGET, {
    state: 'attached',
    timeout: config.TIMEOUTS.WIDGET
  });

  // Ждём, пока виджет станет видимым (display !== 'none')
  await waitForWidgetVisible(page);

  const widgets = page.locator(config.selectors.WIDGET);
  const count = await widgets.count();

  // Ожидаем как минимум 1 виджет
  expect(count).toBeGreaterThanOrEqual(1);
  expect(count).toBeLessThanOrEqual(config.EXPECTED_IFRAME_COUNT);

  // Проверяем, что хотя бы один виджет полностью валиден
  let validWidgetFound = false;
  const validationErrors = [];

  for (let i = 0; i < count; i++) {
    const result = await validateWidget(page, i);
    if (result.isValid) {
      validWidgetFound = true;
      break;
    }
    validationErrors.push(...result.errors);
  }

  if (!validWidgetFound) {
    throw new Error(`No valid widgets found. Errors: ${validationErrors.join('; ')}`);
  }
}

// Для совместимости с expect из Playwright
const { expect } = require('@playwright/test');

module.exports = {
  validateWidget,
  validateWidgetPosition,
  getWidgetFrame,
  waitForFrameContent,
  openChatViaMedal,
  openChatAndClickTrack,
  waitForAuthorizationForm,
  performTrackScenario,
  expectWidgetsVisible
};
