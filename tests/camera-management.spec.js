const { test, expect } = require('./test-config');

test.describe('Camera Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage before each test
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for app to be fully initialized
    await page.waitForFunction(() => window.sportsDashcamApp && window.sportsDashcamApp.ready);
    await page.evaluate(() => window.sportsDashcamApp.ready);
  });

  test('should open add camera dialog', async ({ page }) => {
    await page.locator('#addFirstCamera').click();
    const dialog = page.locator('#addCameraDialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Add Camera');
    await expect(page.locator('#cameraName')).toBeVisible();
    await expect(page.locator('#cameraUrl')).toBeVisible();
  });

  test('should close add camera dialog with close button', async ({ page }) => {
    await page.locator('#addFirstCamera').click();
    await page.locator('#closeAddDialog').click();
    const dialog = page.locator('#addCameraDialog.active');
    await expect(dialog).not.toBeVisible();
  });

  test('should close add camera dialog with cancel button', async ({ page }) => {
    await page.locator('#addFirstCamera').click();
    await page.locator('#cancelAddCamera').click();
    const dialog = page.locator('#addCameraDialog.active');
    await expect(dialog).not.toBeVisible();
  });

  test('should add a camera', async ({ page }) => {
    // Open dialog
    await page.locator('#addFirstCamera').click();

    // Fill in camera details
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');

    // Submit
    await page.locator('#confirmAddCamera').click();

    // Dialog should close (loses active class) - wait longer for webkit
    await expect(page.locator('#addCameraDialog.active')).not.toBeVisible({ timeout: 5000 });

    // Empty state should be hidden
    await expect(page.locator('#emptyState')).toHaveClass(/hidden/);

    // Camera card should appear
    const cameraCard = page.locator('.camera-card[id^="camera-"]').first();
    await expect(cameraCard).toBeVisible();
    await expect(cameraCard.locator('h3')).toContainText('Test Camera');
  });

  test('should add multiple cameras', async ({ page }) => {
    // Add first camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Camera 1');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for first camera
    await page.locator('.camera-card[id^="camera-"]').first().waitFor({ state: 'visible' });
    await page.waitForTimeout(200);

    // Add second camera
    await page.locator('#addCameraCard').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Camera 2');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for second camera
    await page.locator('.camera-card[id^="camera-"]').nth(1).waitFor({ state: 'visible' });
    await page.waitForTimeout(200);

    // Check both cameras exist (count actual camera cards, not add-camera-card)
    const cameras = page.locator('.camera-card[id^="camera-"]');
    await expect(cameras).toHaveCount(2);
  });

  test('should persist cameras in localStorage', async ({ page }) => {
    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Persistent Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera to be added before reloading
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible' });
    await page.waitForTimeout(300);

    // Reload page
    await page.reload();

    // Camera should still be there
    const cameraCard = page.locator('.camera-card[id^="camera-"]').first();
    await expect(cameraCard).toBeVisible();
    await expect(cameraCard.locator('h3')).toContainText('Persistent Camera');
  });

  test('should remove a camera', async ({ page }) => {
    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Camera to Remove');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera to be added
    const cameraCard = page.locator('.camera-card[id^="camera-"]').first();
    await cameraCard.waitFor({ state: 'visible' });
    await page.waitForTimeout(200);

    // Setup dialog handler for confirmation
    page.once('dialog', dialog => dialog.accept());

    // Remove the camera
    await cameraCard.locator('button[data-action="remove"]').click();

    // Camera should be removed (only count actual cameras, not the add-camera-card)
    await expect(page.locator('.camera-card[id^="camera-"]')).toHaveCount(0);
    await expect(page.locator('#emptyState')).toBeVisible();
  });

  test('should open camera settings dialog', async ({ page }) => {
    // Add a camera first
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera to be added
    const cameraCard = page.locator('.camera-card[id^="camera-"]').first();
    await cameraCard.waitFor({ state: 'visible' });
    await page.waitForTimeout(200);

    // Open camera settings
    await cameraCard.locator('button[data-action="settings"]').click();

    // Settings dialog should appear
    const settingsDialog = page.locator('#cameraSettingsDialog');
    await expect(settingsDialog).toBeVisible();
    await expect(settingsDialog).toContainText('Camera Settings');
  });
});
