const { test, expect } = require('./test-config');

test.describe('Lock Screen Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have lock screen button', async ({ page }) => {
    await expect(page.locator('#lockScreenBtn')).toBeVisible();
  });

  test('should open lock screen overlay', async ({ page }) => {
    await page.locator('#lockScreenBtn').click();

    const overlay = page.locator('#lockScreenOverlay');
    await expect(overlay).toBeVisible();
    await expect(overlay).toContainText('LOCKED');
    await expect(overlay).toContainText('Mouse gestures are active');
  });

  test('should show unlock button on lock screen', async ({ page }) => {
    await page.locator('#lockScreenBtn').click();

    const unlockBtn = page.locator('#unlockBtn');
    await expect(unlockBtn).toBeVisible();
  });

  test('should unlock screen', async ({ page }) => {
    await page.locator('#lockScreenBtn').click();
    await page.locator('#unlockBtn').click();

    const overlay = page.locator('#lockScreenOverlay.active');
    await expect(overlay).not.toBeVisible();
  });

  test('should hide main UI elements when locked', async ({ page }) => {
    await page.locator('#lockScreenBtn').click();

    const overlay = page.locator('#lockScreenOverlay');
    await expect(overlay).toBeVisible();

    // Main content should be behind overlay
    const header = page.locator('.app-header');
    const zIndexOverlay = await overlay.evaluate(el => window.getComputedStyle(el).zIndex);
    const zIndexHeader = await header.evaluate(el => window.getComputedStyle(el).zIndex);

    expect(parseInt(zIndexOverlay)).toBeGreaterThan(parseInt(zIndexHeader) || 0);
  });
});

test.describe('Lock Screen Functionality - touch input', () => {
  // Real touch hardware requires hasTouch so Playwright dispatches genuine
  // touchstart/touchend (and lets Chromium synthesize the follow-up click),
  // instead of a plain mouse click that would never exercise the bug.
  test.use({ hasTouch: true });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should unlock screen via touch tap on unlock button', async ({ page }) => {
    await page.locator('#lockScreenBtn').tap();

    const overlay = page.locator('#lockScreenOverlay.active');
    await expect(overlay).toBeVisible();

    // On a phone, touchstart's preventDefault() used to be called
    // unconditionally while locked, which suppresses the browser's
    // synthetic click after touchend - so a real finger tap could never
    // unlock. Tapping (not clicking) here reproduces that scenario.
    await page.locator('#unlockBtn').tap();

    await expect(overlay).not.toBeVisible();
  });
});
