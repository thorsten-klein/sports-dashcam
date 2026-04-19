const { test, expect } = require('@playwright/test');

test.describe('Settings Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should open settings dialog', async ({ page }) => {
    await page.locator('#settingsBtn').click();
    const dialog = page.locator('#settingsDialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Settings');
  });

  test('should close settings dialog', async ({ page }) => {
    await page.locator('#settingsBtn').click();
    await page.locator('#cancelSettings').click();
    const dialog = page.locator('#settingsDialog');
    await expect(dialog).not.toHaveClass(/active/);
  });

  test('should have settings tabs', async ({ page }) => {
    await page.locator('#settingsBtn').click();

    await expect(page.locator('#generalSettingsTab')).toBeVisible();
    await expect(page.locator('#hotkeySettingsTab')).toBeVisible();
  });

  test('should switch between settings tabs', async ({ page }) => {
    await page.locator('#settingsBtn').click();

    // General tab active by default
    await expect(page.locator('#generalSettingsTab')).toHaveClass(/active/);
    await expect(page.locator('#generalSettingsContent')).not.toHaveClass(/hidden/);

    // Switch to hotkey tab
    await page.locator('#hotkeySettingsTab').click();
    await expect(page.locator('#hotkeySettingsTab')).toHaveClass(/active/);
    await expect(page.locator('#hotkeySettingsContent')).not.toHaveClass(/hidden/);
    await expect(page.locator('#generalSettingsContent')).toHaveClass(/hidden/);
  });

  test('should show pre-tag and post-tag duration settings', async ({ page }) => {
    await page.locator('#settingsBtn').click();

    await expect(page.locator('#preTagDuration')).toBeVisible();
    await expect(page.locator('#postTagDuration')).toBeVisible();
    await expect(page.locator('label[for="preTagDuration"]')).toContainText('Time Before Tag');
    await expect(page.locator('label[for="postTagDuration"]')).toContainText('Time After Tag');
  });

  test('should increment pre-tag duration', async ({ page }) => {
    await page.locator('#settingsBtn').click();

    const preTagInput = page.locator('#preTagDuration');
    const initialValue = await preTagInput.inputValue();

    await page.locator('#preTagIncrease').click();

    const newValue = await preTagInput.inputValue();
    expect(parseInt(newValue)).toBeGreaterThan(parseInt(initialValue));
  });

  test('should decrement pre-tag duration', async ({ page }) => {
    await page.locator('#settingsBtn').click();

    const preTagInput = page.locator('#preTagDuration');
    const initialValue = await preTagInput.inputValue();

    await page.locator('#preTagDecrease').click();

    const newValue = await preTagInput.inputValue();
    expect(parseInt(newValue)).toBeLessThan(parseInt(initialValue));
  });

  test('should save settings', async ({ page }) => {
    await page.locator('#settingsBtn').click();

    // Change pre-tag duration
    await page.locator('#preTagDuration').fill('15');
    await page.locator('#postTagDuration').fill('5');

    // Save settings
    await page.locator('#saveSettings').click();

    // Dialog should close
    await expect(page.locator('#settingsDialog')).not.toHaveClass(/active/);

    // Reopen and verify settings persisted
    await page.locator('#settingsBtn').click();
    await expect(page.locator('#preTagDuration')).toHaveValue('15');
    await expect(page.locator('#postTagDuration')).toHaveValue('5');
  });

  test('should show hotkey controls', async ({ page }) => {
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    await expect(page.locator('#detectHotkey')).toBeVisible();
    await expect(page.locator('#detectGesture')).toBeVisible();
    await expect(page.locator('#tagSelector')).toBeVisible();
  });

  test('should open hotkey detector', async ({ page }) => {
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    await page.locator('#detectHotkey').click();

    const detector = page.locator('#hotkeyDetector');
    await expect(detector).not.toHaveClass(/hidden/);
    await expect(detector).toContainText('Press any key combination');
  });

  test('should cancel hotkey detection', async ({ page }) => {
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    await page.locator('#detectHotkey').click();
    await page.locator('#cancelDetectHotkey').click();

    const detector = page.locator('#hotkeyDetector');
    await expect(detector).toHaveClass(/hidden/);
  });
});
