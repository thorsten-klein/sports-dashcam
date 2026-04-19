const { test, expect } = require('@playwright/test');

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have proper page title', async ({ page }) => {
    await expect(page).toHaveTitle('Sports-Dashcam');
  });

  test('should have favicon', async ({ page }) => {
    const favicon = page.locator('link[rel="icon"]');
    await expect(favicon).toBeDefined();
  });

  test('should have proper viewport meta tag', async ({ page }) => {
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toBeDefined();
  });

  test('should have Material Icons loaded', async ({ page }) => {
    const materialIcons = page.locator('link[href*="material+icons"]');
    await expect(materialIcons).toBeDefined();
  });

  test('should have buttons with titles', async ({ page }) => {
    await expect(page.locator('#startRecordingBtn[title]')).toBeDefined();
    await expect(page.locator('#lockScreenBtn[title]')).toBeDefined();
    await expect(page.locator('#fullscreenBtn[title]')).toBeDefined();
    await expect(page.locator('#settingsBtn[title]')).toBeDefined();
  });

  test('should have form labels', async ({ page }) => {
    await page.locator('#addFirstCamera').click();

    await expect(page.locator('label[for="cameraName"]')).toBeVisible();
    await expect(page.locator('label[for="cameraUrl"]')).toBeVisible();
  });

  test('should have proper button text', async ({ page }) => {
    await expect(page.locator('#addFirstCamera')).toContainText('Add Camera');
  });

  test('should have icons with Material Icons class', async ({ page }) => {
    const icons = page.locator('.material-icons');
    const count = await icons.count();
    expect(count).toBeGreaterThan(0);
  });
});
