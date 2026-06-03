const { test, expect } = require('./test-config');

test.describe('Tag Buttons', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Disable CSS transitions so dialog open is instant — prevents a WebKit race where
    // the dialog's scale animation shifts input positions while Playwright fills them,
    // causing keystrokes to land on the wrong input.
    await page.addStyleTag({ content: '*, *::before, *::after { transition-duration: 0ms !important; animation-duration: 0ms !important; }' });
  });

  test('should not show tag buttons when not recording', async ({ page }) => {
    const tagButtonsContainer = page.locator('#tagButtonsContainer');
    await expect(tagButtonsContainer).toHaveClass(/hidden/);
  });

  test('should show tag buttons when recording', async ({ page }) => {
    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Start recording
    const startRecordingBtn = page.locator('#startRecordingBtn');
    await expect(startRecordingBtn).not.toBeDisabled({ timeout: 10000 });
    await startRecordingBtn.click();

    // Tag buttons should appear
    const tagButtonsContainer = page.locator('#tagButtonsContainer');
    await expect(tagButtonsContainer).not.toHaveClass(/hidden/);
  });

  test('should show all 4 tag buttons by default', async ({ page }) => {
    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Start recording
    const startRecordingBtn = page.locator('#startRecordingBtn');
    await expect(startRecordingBtn).not.toBeDisabled({ timeout: 10000 });
    await startRecordingBtn.click();

    // All 4 tag buttons should be visible
    await expect(page.locator('#tagButtonA')).toBeVisible();
    await expect(page.locator('#tagButtonB')).toBeVisible();
    await expect(page.locator('#tagButtonC')).toBeVisible();
    await expect(page.locator('#tagButtonD')).toBeVisible();
  });

  test('should have correct labels on tag buttons', async ({ page }) => {
    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Start recording
    const startRecordingBtn = page.locator('#startRecordingBtn');
    await expect(startRecordingBtn).not.toBeDisabled({ timeout: 10000 });
    await startRecordingBtn.click();

    // Check button labels
    await expect(page.locator('#tagButtonA')).toContainText('Tag A');
    await expect(page.locator('#tagButtonB')).toContainText('Tag B');
    await expect(page.locator('#tagButtonC')).toContainText('Tag C');
    await expect(page.locator('#tagButtonD')).toContainText('Tag D');
  });

  test('should create tag with label when clicking tag button', async ({ page }) => {
    // Add a camera with local MJPEG stream
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera to be added
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    const startRecordingBtn = page.locator('#startRecordingBtn');
    await expect(startRecordingBtn).not.toBeDisabled({ timeout: 10000 });

    // Start recording
    await startRecordingBtn.click();

    // Wait a bit so there's video to tag
    await page.waitForTimeout(500);

    // Click Tag A button
    await page.locator('#tagButtonA').click();

    // Should switch to tags tab
    await expect(page.locator('#tagsTab')).toHaveClass(/active/);

    // Check that a tag was created
    const tagItem = page.locator('.tag-item').first();
    await expect(tagItem).toBeVisible();

    // Wait a bit for tag to be fully saved to localStorage
    await page.waitForTimeout(200);

    // Check that the tag has label A stored in localStorage
    const tags = await page.evaluate(() => {
      const data = localStorage.getItem('videoTagger_tags');
      return data ? JSON.parse(data) : [];
    });

    expect(tags.length).toBe(1);
    expect(tags[0].label).toBe('A');
  });

  test('should create tags with different labels', async ({ page }) => {
    // Add a camera with local MJPEG stream
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera to be added
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    const startRecordingBtn = page.locator('#startRecordingBtn');
    await expect(startRecordingBtn).not.toBeDisabled({ timeout: 10000 });

    // Start recording
    await startRecordingBtn.click();

    // Wait a bit so there's video to tag
    await page.waitForTimeout(500);

    // Click Tag A button
    await page.locator('#tagButtonA').click();

    // Wait for tag to be created (longer wait to ensure different timestamps/filenames)
    await page.waitForTimeout(1500);

    // Click Tag B button
    await page.locator('#tagButtonB').click();

    // Wait for tag to be fully created before checking localStorage
    await page.waitForTimeout(500);

    // Check that both tags were created with different labels
    const tags = await page.evaluate(() => {
      const data = localStorage.getItem('videoTagger_tags');
      return data ? JSON.parse(data) : [];
    });

    expect(tags.length).toBe(2);
    expect(tags[0].label).toBe('B'); // Newest tag first
    expect(tags[1].label).toBe('A');
  });

  test('should hide tag buttons when stopping recording', async ({ page }) => {
    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Start recording
    const startRecordingBtn = page.locator('#startRecordingBtn');
    await expect(startRecordingBtn).not.toBeDisabled({ timeout: 10000 });
    await startRecordingBtn.click();

    // Tag buttons should appear
    const tagButtonsContainer = page.locator('#tagButtonsContainer');
    await expect(tagButtonsContainer).not.toHaveClass(/hidden/);

    // Stop recording
    await startRecordingBtn.click();

    // Tag buttons should be hidden
    await expect(tagButtonsContainer).toHaveClass(/hidden/);
  });
});

test.describe('Tag Button Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.addStyleTag({ content: '*, *::before, *::after { transition-duration: 0ms !important; animation-duration: 0ms !important; }' });
  });

  test('should have tag label count setting in settings dialog', async ({ page }) => {
    await page.locator('#settingsBtn').click();

    const tagLabelCountInput = page.locator('#tagLabelCount');
    await expect(tagLabelCountInput).toBeVisible();
    await expect(tagLabelCountInput).toHaveValue('4');
  });

  test('should have increase/decrease buttons for tag label count', async ({ page }) => {
    await page.locator('#settingsBtn').click();

    await expect(page.locator('#tagLabelIncrease')).toBeVisible();
    await expect(page.locator('#tagLabelDecrease')).toBeVisible();
  });

  test('should increase tag label count', async ({ page }) => {
    await page.locator('#settingsBtn').click();

    const tagLabelCountInput = page.locator('#tagLabelCount');

    // Set to 2
    await tagLabelCountInput.fill('2');

    // Click increase
    await page.locator('#tagLabelIncrease').click();

    // Should be 3
    await expect(tagLabelCountInput).toHaveValue('3');
  });

  test('should decrease tag label count', async ({ page }) => {
    await page.locator('#settingsBtn').click();

    const tagLabelCountInput = page.locator('#tagLabelCount');

    // Set to 3
    await tagLabelCountInput.fill('3');

    // Click decrease
    await page.locator('#tagLabelDecrease').click();

    // Should be 2
    await expect(tagLabelCountInput).toHaveValue('2');
  });

  test('should not decrease below 1', async ({ page }) => {
    await page.locator('#settingsBtn').click();

    const tagLabelCountInput = page.locator('#tagLabelCount');

    // Set to 1
    await tagLabelCountInput.fill('1');

    // Click decrease
    await page.locator('#tagLabelDecrease').click();

    // Should still be 1
    await expect(tagLabelCountInput).toHaveValue('1');
  });

  test('should not increase above 10', async ({ page }) => {
    await page.locator('#settingsBtn').click();

    const tagLabelCountInput = page.locator('#tagLabelCount');

    // Set to 10
    await tagLabelCountInput.fill('10');

    // Click increase
    await page.locator('#tagLabelIncrease').click();

    // Should still be 10
    await expect(tagLabelCountInput).toHaveValue('10');
  });

  test('should save tag label count setting', async ({ page }) => {
    await page.locator('#settingsBtn').click();

    const tagLabelCountInput = page.locator('#tagLabelCount');
    await tagLabelCountInput.fill('2');

    await page.locator('#saveSettings').click();

    // Check localStorage
    const settings = await page.evaluate(() => {
      const data = localStorage.getItem('videoTagger_settings');
      return data ? JSON.parse(data) : null;
    });

    expect(settings.tagLabelCount).toBe(2);
  });

  test('should persist tag label count after page reload', async ({ page }) => {
    // Set tag label count to 2
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('2');
    await page.locator('#saveSettings').click();

    // Reload page
    await page.reload();

    // Open settings again
    await page.locator('#settingsBtn').click();

    // Should still be 2
    await expect(page.locator('#tagLabelCount')).toHaveValue('2');
  });

  test('should show only configured number of tag buttons', async ({ page }) => {
    // Set tag label count to 2
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('2');
    await page.locator('#saveSettings').click();

    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Start recording
    const startRecordingBtn = page.locator('#startRecordingBtn');
    await expect(startRecordingBtn).not.toBeDisabled({ timeout: 10000 });
    await startRecordingBtn.click();

    // Only Tag A and Tag B should be visible
    await expect(page.locator('#tagButtonA')).toBeVisible();
    await expect(page.locator('#tagButtonB')).toBeVisible();
    await expect(page.locator('#tagButtonC')).toHaveClass(/hidden/);
    await expect(page.locator('#tagButtonD')).toHaveClass(/hidden/);
  });

  test('should show only 1 tag button when configured', async ({ page }) => {
    // Set tag label count to 1
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('1');
    await page.locator('#saveSettings').click();

    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Start recording
    const startRecordingBtn = page.locator('#startRecordingBtn');
    await expect(startRecordingBtn).not.toBeDisabled({ timeout: 10000 });
    await startRecordingBtn.click();

    // Only Tag A should be visible
    await expect(page.locator('#tagButtonA')).toBeVisible();
    await expect(page.locator('#tagButtonB')).toHaveClass(/hidden/);
    await expect(page.locator('#tagButtonC')).toHaveClass(/hidden/);
    await expect(page.locator('#tagButtonD')).toHaveClass(/hidden/);
  });

  test('should show all 4 tag buttons when configured', async ({ page }) => {
    // Set tag label count to 4
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('4');
    await page.locator('#saveSettings').click();

    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Start recording
    const startRecordingBtn = page.locator('#startRecordingBtn');
    await expect(startRecordingBtn).not.toBeDisabled({ timeout: 10000 });
    await startRecordingBtn.click();

    // All 4 tag buttons should be visible
    await expect(page.locator('#tagButtonA')).toBeVisible();
    await expect(page.locator('#tagButtonB')).toBeVisible();
    await expect(page.locator('#tagButtonC')).toBeVisible();
    await expect(page.locator('#tagButtonD')).toBeVisible();
  });

  test('should update visible tag buttons when changing setting while recording', async ({ page }) => {
    // Add a camera and start recording with 4 buttons
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera to be added
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    // Start recording
    const startRecordingBtn = page.locator('#startRecordingBtn');
    await expect(startRecordingBtn).not.toBeDisabled({ timeout: 10000 });
    await startRecordingBtn.click();

    // All 4 should be visible
    await expect(page.locator('#tagButtonA')).toBeVisible();
    await expect(page.locator('#tagButtonB')).toBeVisible();
    await expect(page.locator('#tagButtonC')).toBeVisible();
    await expect(page.locator('#tagButtonD')).toBeVisible();

    // Change setting to 2
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('2');
    await page.locator('#saveSettings').click();

    // Wait for settings to be applied
    await page.waitForTimeout(300);

    // Now only 2 should be visible
    await expect(page.locator('#tagButtonA')).toBeVisible();
    await expect(page.locator('#tagButtonB')).toBeVisible();
    await expect(page.locator('#tagButtonC')).toHaveClass(/hidden/);
    await expect(page.locator('#tagButtonD')).toHaveClass(/hidden/);
  });
});
