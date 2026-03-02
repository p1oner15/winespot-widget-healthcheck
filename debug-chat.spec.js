const { test, expect } = require('@playwright/test');

test('debug: исследовать структуру чата', async ({ page }) => {
  await page.goto('https://staging.getwinespot.com/scottharveywinery-staging/index.html', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  // Ждём виджет
  await page.waitForSelector('#winespot', { timeout: 30000 });

  // Переключаемся на iframe
  const widgetFrame = page.frameLocator('#winespot').first();

  // Делаем скриншот всего iframe (если возможно)
  await page.waitForTimeout(3000);

  // Ищем все элементы с классами внутри iframe
  try {
    const allClasses = await widgetFrame.locator('[class]').evaluateAll(els =>
      els.map(el => el.className).slice(0, 50)
    );
    console.log('Классы в iframe ДО клика:', allClasses);
  } catch (e) {
    console.log('Ошибка при получении классов:', e.message);
  }

  // Пробуем найти .ws_open_welc .inp
  const chatInput = widgetFrame.locator('.ws_open_welc .inp');
  const count = await chatInput.count();
  console.log('Найдено .ws_open_welc .inp:', count);

  if (count > 0) {
    console.log('Кликаем на .ws_open_welc .inp...');
    await chatInput.click({ timeout: 5000, force: true });

    // Ждём немного
    await page.waitForTimeout(2000);

    // Смотрим классы ПОСЛЕ клика
    try {
      const allClassesAfter = await widgetFrame.locator('[class]').evaluateAll(els =>
        els.map(el => el.className).slice(0, 50)
      );
      console.log('Классы в iframe ПОСЛЕ клика:', allClassesAfter);
    } catch (e) {
      console.log('Ошибка при получении классов после клика:', e.message);
    }

    // Ищем [sendtochat] ПОСЛЕ клика
    const sendtochat = widgetFrame.locator('[sendtochat]');
    const sendtochatCount = await sendtochat.count();
    console.log('Найдено [sendtochat] ПОСЛЕ клика:', sendtochatCount);

    if (sendtochatCount > 0) {
      const texts = await sendtochat.evaluateAll(els => els.map(el => el.textContent?.trim()));
      console.log('Тексты [sendtochat]:', texts);

      // Проверяем видимость
      const isVisible = await sendtochat.first().isVisible();
      console.log('Первый [sendtochat] виден?', isVisible);
    }
  }

  await page.waitForTimeout(5000); // Даём время посмотреть
});

test('debug: проверить iframe медальки', async ({ page }) => {
  await page.goto('https://staging.getwinespot.com/scottharveywinery-staging/index.html', {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  });

  await page.waitForSelector('#winespot', { timeout: 30000 });
  await page.waitForTimeout(2000);

  // Проверяем наличие медальки
  const hasMedal = await page.locator('#wsf_medal').count() > 0;
  console.log('Есть медалька #wsf_medal:', hasMedal);

  if (hasMedal) {
    const medal = page.locator('#wsf_medal');
    const medalFrame = medal.contentFrame();
    await medalFrame.locator('body').waitFor({ state: 'attached', timeout: 10000 });
    
    // Получаем HTML медальки ДО клика
    const html = await medalFrame.locator('body').innerHTML();
    console.log('HTML медальки:', html);
    
    // Ищем все кликабельные элементы в медальке
    const divs = await medalFrame.locator('div').count();
    console.log('Всего div в медальке:', divs);
    
    for (let i = 0; i < divs; i++) {
      const div = medalFrame.locator('div').nth(i);
      const classes = await div.getAttribute('class');
      const text = await div.textContent();
      console.log(`div[${i}] class="${classes}" text="${text?.trim()}"`);
    }
    
    // Кликаем на .face (первый div)
    console.log('Кликаем на .face...');
    await medalFrame.locator('.face').click({ force: true });
    await page.waitForTimeout(3000);
    
    // Проверяем, исчезла ли медалька
    const medalVisible = await page.locator('#wsf_medal').isVisible();
    console.log('Медалька видна после клика на .face:', medalVisible);
  }

  // Теперь проверяем основной виджет
  const widgetFrame = page.frameLocator('#winespot').first();
  
  // Ищем кнопку Track
  const trackButton = widgetFrame.getByText('Track and manage my orders', { exact: false }).first();
  const trackVisible = await trackButton.isVisible().catch(() => false);
  console.log('Кнопка Track видна в #winespot:', trackVisible);
  
  // Проверяем все iframe на странице
  const allFrames = page.locator('iframe');
  const frameCount = await allFrames.count();
  console.log('Всего iframe на странице:', frameCount);
  
  for (let i = 0; i < frameCount; i++) {
    const frame = allFrames.nth(i).contentFrame();
    const trackInFrame = frame.getByText('Track and manage my orders', { exact: false }).first();
    const visible = await trackInFrame.isVisible().catch(() => false);
    const text = await trackInFrame.textContent().catch(() => '');
    console.log(`iframe[${i}] Track visible:`, visible, 'text:', text);
  }

  await page.waitForTimeout(2000);
});
