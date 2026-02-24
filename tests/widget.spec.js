const { test, expect } = require('@playwright/test');

const partners = [
  {
    name: 'Scott Harvey Winery (staging)',
    url: 'https://staging.getwinespot.com/scottharveywinery-staging/index.html'
  },
  {
    name: 'Tank Garage Winery (staging)',
    url: 'https://staging.getwinespot.com/tankgaragewinery-staging/index.html'
  }
];

partners.forEach((partner) => {

  test(`Widget health check on ${partner.name}`, async ({ page }) => {

    await page.goto(partner.url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Ждём появления любого winespot iframe
    await page.waitForSelector('#winespot', { timeout: 60000 });

    const widgets = page.locator('#winespot');
    const count = await widgets.count();

    expect(count).toBeGreaterThan(0);

    let validWidgetFound = false;

    for (let i = 0; i < count; i++) {
      const widget = widgets.nth(i);

      if (await widget.isVisible()) {

        const box = await widget.boundingBox();

        if (box && box.width > 30 && box.height > 30) {

          const viewport = page.viewportSize();

          if (
            box.x >= 0 &&
            box.y >= 0 &&
            box.x + box.width <= viewport.width &&
            box.y + box.height <= viewport.height
          ) {
            validWidgetFound = true;
            break;
          }
        }
      }
    }

    expect(validWidgetFound).toBeTruthy();

  });

});
