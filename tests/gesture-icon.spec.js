const { test, expect } = require('@playwright/test');

test.describe('Gesture Icon', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('detect gesture button should use gesture icon', async ({ page }) => {
    // Open settings
    await page.locator('#settingsBtn').click();

    // Switch to hotkey settings tab
    await page.locator('#hotkeySettingsTab').click();

    // Check the detect gesture button
    const detectGestureBtn = page.locator('#detectGesture');
    await expect(detectGestureBtn).toBeVisible();

    const icon = detectGestureBtn.locator('.material-icons');
    const iconText = await icon.textContent();

    expect(iconText).toBe('gesture');
  });

  test('gesture detector modal should use gesture icon', async ({ page }) => {
    // Open settings
    await page.locator('#settingsBtn').click();

    // Switch to hotkey settings tab
    await page.locator('#hotkeySettingsTab').click();

    // Click detect gesture to open the detector
    await page.locator('#detectGesture').click();

    // Check the gesture detector modal
    const gestureDetector = page.locator('#gestureDetector');
    await expect(gestureDetector).toBeVisible();

    const icon = gestureDetector.locator('.detector-content .material-icons').first();
    const iconText = await icon.textContent();

    expect(iconText).toBe('gesture');
  });
});
