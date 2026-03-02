const { test, expect } = require('@playwright/test');
const config = require('./config');

/**
 * Находит все виджеты на странице и возвращает их количество
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<{ count: number, widgets: import('@playwright/test').Locator }>}
 */
async function getWidgets(page) {
  await page.waitForSelector('#winespot', { timeout: config.WIDGET_TIMEOUT });
  const widgets = page.locator('#winespot');
  const count = await widgets.count();
  return { count, widgets };
}

/**
 * Проверяет, что виджет — это iframe с корректными размерами и положением в viewport
 * @param {import('@playwright/test').Page} page
 * @param {number} index — индекс виджета
 * @returns {Promise<boolean>}
 */
async function isWidgetValid(page, index) {
  const widgets = page.locator('#winespot');
  const widget = widgets.nth(index);

  // Проверяем, что элемент существует и это iframe
  const tagName = await widget.evaluate(el => el.tagName);
  if (tagName !== 'IFRAME') {
    return false;
  }

  if (!await widget.isVisible()) {
    return false;
  }

  const box = await widget.boundingBox();
  if (!box || box.width <= config.MIN_WIDGET_SIZE || box.height <= config.MIN_WIDGET_SIZE) {
    return false;
  }

  const viewport = page.viewportSize();
  if (
    box.x < 0 ||
    box.y < 0 ||
    box.x + box.width > viewport.width ||
    box.y + box.height > viewport.height
  ) {
    return false;
  }

  return true;
}

/**
 * Проверяет наличие и видимость всех ожидаемых iframe виджетов
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<void>}
 */
async function expectWidgetsVisible(page) {
  const { count, widgets } = await getWidgets(page);

  // Ожидаем как минимум 1 виджет, допускаем 2 (основной + медалька)
  expect(count).toBeGreaterThanOrEqual(1);
  expect(count).toBeLessThanOrEqual(config.EXPECTED_IFRAME_COUNT);

  // Проверяем, что хотя бы один виджет полностью валиден
  let validWidgetFound = false;
  for (let i = 0; i < count; i++) {
    if (await isWidgetValid(page, i)) {
      validWidgetFound = true;
      break;
    }
  }

  expect(validWidgetFound).toBeTruthy();
}

/**
 * Открывает чат (если ещё не открыт) и нажимает кнопку "Track and manage my orders"
 * @param {import('@playwright/test').Page} page
 */
async function openChatAndClickTrack(page) {
  // 1. Ждём появления iframe виджета
  await page.waitForSelector('#winespot', { timeout: config.WIDGET_TIMEOUT });
  const widgetFrame = page.locator('#winespot').contentFrame();

  // Ждём, пока iframe станет доступным
  await widgetFrame.locator('body').waitFor({ state: 'attached', timeout: 10000 });
  // Даём виджету время на полный рендер
  await page.waitForTimeout(2000);

  // Пробуем найти кнопку Track
  let trackOrderButton = widgetFrame.getByText('Track and manage my orders', { exact: false }).first();
  let isTrackVisible = await trackOrderButton.isVisible().catch(() => false);

  // Если кнопка скрыта — пробуем открыть чат через медальку
  if (!isTrackVisible) {
    await page.waitForSelector('#wsf_medal', { timeout: config.WIDGET_TIMEOUT });
    const medal = page.locator('#wsf_medal');
    const medalFrame = medal.contentFrame();

    // Кликаем по медальке для открытия чата (может потребоваться 2 клика)
    // Медалька иногда требует двойного клика для открытия чата
    await medalFrame.locator('.face').click({ force: true });
    await page.waitForTimeout(1500);

    // Проверяем, открылся ли чат
    isTrackVisible = await trackOrderButton.isVisible().catch(() => false);

    // Если чат не открылся с первого раза — кликаем ещё раз
    if (!isTrackVisible) {
      await medalFrame.locator('.face').click({ force: true });
      await page.waitForTimeout(1500);
      isTrackVisible = await trackOrderButton.isVisible().catch(() => false);
    }

    // После клика ждём появления кнопки Track
    if (isTrackVisible) {
      await trackOrderButton.waitFor({ state: 'visible', timeout: 10000 });
    } else {
      throw new Error('Не удалось открыть чат через медальку после 2 попыток');
    }
  } else {
    await trackOrderButton.waitFor({ state: 'visible', timeout: 10000 });
  }
  // Кликаем на кнопку Track
  await trackOrderButton.click({ force: true });
  await page.waitForTimeout(2000); // Ждём ответа бота
}

/**
 * Тестирует наличие виджета на странице
 * @param {import('@playwright/test').Page} page
 */
async function testWidgetVisible(page) {
  const { count } = await getWidgets(page);

  // Ожидаем как минимум 1 виджет, допускаем 2 (основной + медалька)
  expect(count).toBeGreaterThanOrEqual(1);
  expect(count).toBeLessThanOrEqual(config.EXPECTED_IFRAME_COUNT);

  // Проверяем, что хотя бы один виджет полностью валиден
  let validWidgetFound = false;
  for (let i = 0; i < count; i++) {
    if (await isWidgetValid(page, i)) {
      validWidgetFound = true;
      break;
    }
  }

  expect(validWidgetFound).toBeTruthy();
}

/**
 * Тестирует открытие чата и нажатие кнопки "Track and manage my orders"
 * @param {import('@playwright/test').Page} page
 */
async function testChatTrackOrder(page) {
  // Открываем чат и кликаем Track
  // Эта функция также проверяет реакцию бота: если бекенд не отвечает,
  // форма авторизации не появится и тест упадёт по таймауту
  await openChatAndClickTrack(page);

  const widgetFrame = page.locator('#winespot').contentFrame();

  // Проверяем, что появилась форма авторизации (email поле)
  // Таймаут 10 сек — если бот не ответил, тест отвалится здесь
  const emailField = widgetFrame.getByRole('textbox', { name: 'johndoe@email.com' });
  await emailField.waitFor({ state: 'visible', timeout: 10000 });
  await expect(emailField).toBeVisible();
}

const partners = config.partners;

partners.forEach((partner) => {
  test.describe(`Partner: ${partner.name}`, () => {
    // Увеличиваем таймаут теста до 60 секунд для медленных staging-серверов
    test.describe.configure({ timeout: config.TEST_TIMEOUT });

    test.beforeEach(async ({ page }) => {
      await page.goto(partner.url, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });
    });

    test('должен отображать виджет корректно', async ({ page }) => {
      await testWidgetVisible(page);
    });

    test('должен открывать чат и переходить на форму авторизации по кнопке Track', async ({ page }) => {
        try {
          await testChatTrackOrder(page);
        } catch (error) {
          // Создаём папку для скриншотов, если не существует
          const fs = require('fs');
          const path = require('path');
          const dir = path.resolve(__dirname, '../screenshots');
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
          }
          // Сохраняем скриншот при падении теста
          await page.screenshot({ path: path.join(dir, 'fail_' + Date.now() + '.png'), fullPage: true });
          // Логируем ошибку в консоль для отладки
          console.error('Test failed:', error);
          throw error;
        }
    });
  });
});
