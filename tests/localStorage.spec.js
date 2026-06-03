const { test, expect } = require('./test-config');

test.describe('LocalStorage Persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for app to be fully initialized
    await page.waitForFunction(() => window.videoTaggerApp && window.videoTaggerApp.ready);
    await page.evaluate(() => window.videoTaggerApp.ready);
  });

  test('should save cameras to localStorage', async ({ page }) => {
    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Persistent Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera card to be created (not necessarily for video to load)
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible' });
    await page.waitForTimeout(200);

    // Check localStorage
    const cameras = await page.evaluate(() => {
      const data = localStorage.getItem('videoTagger_cameras');
      return data ? JSON.parse(data) : [];
    });

    expect(cameras.length).toBe(1);
    expect(cameras[0].name).toBe('Persistent Camera');
    expect(cameras[0].url).toBe('http://localhost:8900/stream');
  });

  test('should persist settings in localStorage', async ({ page }) => {
    // Change settings
    await page.locator('#settingsBtn').click();
    await page.locator('#preTagDuration').fill('20');
    await page.locator('#postTagDuration').fill('8');
    await page.locator('#saveSettings').click();

    // Wait for settings dialog to close
    await page.locator('#settingsDialog.active').waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);

    // Check localStorage
    const settings = await page.evaluate(() => {
      const data = localStorage.getItem('videoTagger_settings');
      return data ? JSON.parse(data) : null;
    });

    expect(settings.preTagDuration).toBe(20);
    expect(settings.postTagDuration).toBe(8);
  });

  test('should restore cameras after page reload', async ({ page }) => {
    // Add cameras
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Camera 1');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for first camera to be added
    await page.locator('.camera-card[id^="camera-"]').first().waitFor({ state: 'visible' });
    await page.waitForTimeout(200);

    await page.locator('#addCameraCard').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Camera 2');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for second camera to be added
    await page.locator('.camera-card[id^="camera-"]').nth(1).waitFor({ state: 'visible' });
    await page.waitForTimeout(200);

    // Reload
    await page.reload();

    // Check cameras are restored (only count actual cameras, not add-camera-card)
    const cameras = page.locator('.camera-card[id^="camera-"]');
    await expect(cameras).toHaveCount(2);
  });

  test('should restore settings after page reload', async ({ page }) => {
    // Save settings
    await page.locator('#settingsBtn').click();
    await page.locator('#preTagDuration').fill('15');
    await page.locator('#saveSettings').click();

    // Reload
    await page.reload();

    // Check settings are restored
    await page.locator('#settingsBtn').click();
    await expect(page.locator('#preTagDuration')).toHaveValue('15');
  });

  test('should handle empty localStorage gracefully', async ({ page }) => {
    // Ensure localStorage is empty
    await page.evaluate(() => localStorage.clear());
    await page.reload();

    // App should show empty state
    await expect(page.locator('#emptyState')).toBeVisible();

    // Settings should have defaults
    await page.locator('#settingsBtn').click();
    const preTagValue = await page.locator('#preTagDuration').inputValue();
    expect(parseInt(preTagValue)).toBeGreaterThan(0);
  });
});
