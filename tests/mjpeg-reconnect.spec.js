const { test, expect } = require('./test-config');

test.describe('MJPEG Stream Reconnection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.videoTaggerApp && window.videoTaggerApp.ready);
  });

  test('should reconnect MJPEG stream after disable/enable', async ({ page }) => {
    const streamUrl = 'http://localhost:9999/test-stream';

    // Listen to console messages
    page.on('console', msg => console.log('Browser console:', msg.text()));

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
    // For format detection (fetch), return multipart/x-mixed-replace so the app identifies the stream as MJPEG.
    // For actual image loads (img src), return image/jpeg so Chromium fires img.onload and sets naturalWidth.
    let requestCount = 0;
    await page.route(streamUrl, async (route) => {
      requestCount++;

      if (route.request().resourceType() === 'image') {
        // Actual img src load - return a decodable JPEG so onload fires
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
        // Format detection fetch - return multipart so the app detects MJPEG
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

    // Also handle the same URL with cache-busting query parameter (used on reconnect)
    await page.route(/http:\/\/localhost:9999\/test-stream\?_t=\d+/, async (route) => {
      // Reconnect always loads via img src - return a decodable JPEG so onload fires
      await route.fulfill({
        status: 200,
        contentType: 'image/jpeg',
        headers: {
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*'
        },
        body: minimalJpeg
      });
    });

    // Add camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test MJPEG Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill(streamUrl);
    await page.locator('#confirmAddCamera').click();

    // Wait for camera card to appear
    const cameraCard = page.locator('.camera-card[id^="camera-"]').first();
    await expect(cameraCard).toBeVisible();

    // Wait a bit for stream to initialize
    await page.waitForTimeout(500);

    // Find the disconnect button (power button)
    const disconnectBtn = cameraCard.locator('[title="Disconnect Camera"]');
    await expect(disconnectBtn).toBeVisible();

    // Disable the camera
    await disconnectBtn.click();
    await page.waitForTimeout(300);

    // Button should now say "Reconnect Camera"
    await expect(cameraCard.locator('[title="Reconnect Camera"]')).toBeVisible();

    // Re-enable the camera
    await cameraCard.locator('[title="Reconnect Camera"]').click();
    await page.waitForTimeout(500);

    // Check that we don't have an error message
    const streamStatus = cameraCard.locator('[id^="stream-status-"]');
    const statusText = await streamStatus.textContent();

    // Should not contain "Error" or "Media format not supported"
    expect(statusText).not.toContain('Error');
    expect(statusText).not.toContain('Media format not supported');

    // Should be connected (either "Connected" or "Connected (MJPEG)")
    expect(statusText).toMatch(/Connected/);
  });
});
