const { test, expect } = require('./test-config');

test.describe('Camera Disconnect-Reload-Reconnect', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.sportsDashcamApp && window.sportsDashcamApp.ready);
  });

  test('should reconnect camera after disable, page reload, then enable', async ({ page }) => {
    const streamUrl = 'http://localhost:9999/test-stream';

    // Create a minimal valid JPEG (1x1 red pixel)
    const minimalJpeg = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
      0x7F, 0xFF, 0xD9
    ]);

    // Mock the MJPEG stream endpoint
    await page.route(streamUrl, async (route) => {
      if (route.request().resourceType() === 'image') {
        await route.fulfill({
          status: 200,
          contentType: 'image/jpeg',
          headers: {
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
          },
          body: minimalJpeg
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'multipart/x-mixed-replace; boundary=frame',
          headers: {
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
          },
          body: minimalJpeg
        });
      }
    });

    // Handle cache-busting URLs
    await page.route(/http:\/\/localhost:9999\/test-stream\?_t=\d+/, async (route) => {
      if (route.request().resourceType() === 'image') {
        await route.fulfill({
          status: 200,
          contentType: 'image/jpeg',
          headers: {
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
          },
          body: minimalJpeg
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'multipart/x-mixed-replace; boundary=frame',
          headers: {
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*'
          },
          body: minimalJpeg
        });
      }
    });

    // Step 1: Add camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').fill(streamUrl);
    await page.locator('#confirmAddCamera').click();

    // Wait for camera card to appear and connect
    const cameraCard = page.locator('.camera-card[id^="camera-"]').first();
    await expect(cameraCard).toBeVisible();
    await page.waitForTimeout(500);

    // Verify it's connected
    let streamStatus = cameraCard.locator('[id^="stream-status-"]');
    await expect(streamStatus).toContainText('Connected');

    // Step 2: Disconnect the camera
    const disconnectBtn = cameraCard.locator('[title="Disconnect Camera"]');
    await disconnectBtn.click();
    await page.waitForTimeout(300);

    // Verify it's disconnected
    await expect(cameraCard.locator('[title="Reconnect Camera"]')).toBeVisible();
    const statusDot = cameraCard.locator('.connection-status-dot').first();
    await expect(statusDot).toHaveClass(/disconnected/);

    // Step 3: Reload the page
    await page.reload();
    await page.waitForFunction(() => window.sportsDashcamApp && window.sportsDashcamApp.ready);

    // Camera should still be disconnected after reload
    const cameraCardAfterReload = page.locator('.camera-card[id^="camera-"]').first();
    await expect(cameraCardAfterReload).toBeVisible();
    const reconnectBtn = cameraCardAfterReload.locator('[title="Reconnect Camera"]');
    await expect(reconnectBtn).toBeVisible();

    // Step 4: Reconnect the camera
    await reconnectBtn.click();

    // Wait for connection
    await page.waitForTimeout(2000);

    // Step 5: Verify it doesn't hang on "Connecting..." and actually connects
    streamStatus = cameraCardAfterReload.locator('[id^="stream-status-"]');
    const statusText = await streamStatus.textContent();

    // Should NOT still be "Connecting..."
    expect(statusText).not.toBe('Connecting...');

    // Should be connected
    expect(statusText).toMatch(/Connected/);

    // Button should be "Disconnect Camera" again
    await expect(cameraCardAfterReload.locator('[title="Disconnect Camera"]')).toBeVisible();
  });
});
