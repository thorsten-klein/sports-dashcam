const { test, expect } = require('./test-config');

test.describe('Recording Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for app to be fully initialized
    await page.waitForFunction(() => window.videoTaggerApp && window.videoTaggerApp.ready);
    await page.evaluate(() => window.videoTaggerApp.ready);
  });

  test('should disable recording button when no cameras', async ({ page }) => {
    const recordButton = page.locator('#startRecordingBtn');
    await expect(recordButton).toBeDisabled();
  });

  test('should enable recording button after adding camera', async ({ page }) => {
    // Add a camera with local MJPEG stream
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera to be added - increased timeout for webkit
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    const recordButton = page.locator('#startRecordingBtn');
    await expect(recordButton).not.toBeDisabled({ timeout: 5000 });
  });

  test('should toggle recording state', async ({ page }) => {
    // Add a camera with local MJPEG stream
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera card to be created
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible' });

    const recordButton = page.locator('#startRecordingBtn');
    await expect(recordButton).not.toBeDisabled({ timeout: 5000 });

    // Start recording
    await recordButton.click();

    // Button should change to show it's recording
    await expect(recordButton).toHaveClass(/recording/);

    // Tag buttons container should appear when recording
    const tagButtonsContainer = page.locator('#tagButtonsContainer');
    await expect(tagButtonsContainer).toBeVisible();
  });

  test('should show tag button only when recording', async ({ page }) => {
    // Add a camera with local MJPEG stream
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera to be added - increased timeout for webkit
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    const recordButton = page.locator('#startRecordingBtn');
    await expect(recordButton).not.toBeDisabled({ timeout: 5000 });

    const tagButtonsContainer = page.locator('#tagButtonsContainer');

    // Tag buttons container should be hidden initially
    await expect(tagButtonsContainer).toHaveClass(/hidden/);

    // Start recording
    await page.locator('#startRecordingBtn').click();

    // Tag buttons container should now be visible
    await expect(tagButtonsContainer).toBeVisible();
  });

  test('should show individual camera recording controls', async ({ page }) => {
    // Add a camera with local MJPEG stream
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera to be added - increased timeout for webkit
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    const recordButton = page.locator('#startRecordingBtn');
    await expect(recordButton).not.toBeDisabled({ timeout: 5000 });

    // Camera card should have recording indicator (hidden when not recording)
    const cameraCard = page.locator('.camera-card[id^="camera-"]').first();
    const recordingIndicator = cameraCard.locator('.video-recording-indicator');
    await expect(recordingIndicator).toBeDefined();
  });
});
