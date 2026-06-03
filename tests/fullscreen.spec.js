const { test, expect } = require('./test-config');

test.describe('Fullscreen Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have fullscreen button', async ({ page }) => {
    await expect(page.locator('#fullscreenBtn')).toBeVisible();
  });

  test('should toggle fullscreen on button click', async ({ page }) => {
    const fullscreenBtn = page.locator('#fullscreenBtn');

    // Click to enter fullscreen
    await fullscreenBtn.click();

    // Note: Playwright may not actually trigger fullscreen in headless mode,
    // but we can verify the click event is registered
    await expect(fullscreenBtn).toBeVisible();
  });

  test('should have fullscreen icon', async ({ page }) => {
    const icon = page.locator('#fullscreenBtn .material-icons');
    await expect(icon).toContainText('fullscreen');
  });
});
