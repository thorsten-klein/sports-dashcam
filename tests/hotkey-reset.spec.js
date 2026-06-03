const { test, expect } = require('./test-config');

test.describe('Hotkey Reset', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.videoTaggerApp && window.videoTaggerApp.ready);
  });

  test('should have reset button in hotkeys tab', async ({ page }) => {
    // Open settings
    await page.locator('#settingsBtn').click();

    // Switch to hotkeys tab
    await page.locator('#hotkeySettingsTab').click();

    // Check for reset button
    const resetBtn = page.locator('#resetHotkeys');
    await expect(resetBtn).toBeVisible();
    await expect(resetBtn).toContainText('Reset');

    // Check icon
    const icon = resetBtn.locator('.material-icons');
    await expect(icon).toHaveText('refresh');
  });

  test('should reset hotkeys to default when clicked', async ({ page }) => {
    // Open settings and switch to hotkeys tab
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    // Remove a hotkey first
    const firstRemoveBtn = page.locator('.hotkey-item .material-icons:has-text("delete")').first();
    await firstRemoveBtn.click();

    // Wait for hotkey to be removed
    await page.waitForTimeout(300);

    // Get count of hotkeys before reset
    const hotkeyCountBefore = await page.locator('.hotkey-item').count();

    // Click reset button
    await page.locator('#resetHotkeys').click();

    // Wait for confirmation dialog to appear
    await expect(page.locator('#hotkeyConflictDialog.active')).toBeVisible();

    // Verify confirmation message
    await expect(page.locator('#hotkeyConflictMessage')).toContainText('Reset all hotkeys to default');

    // Click Reset button
    await page.locator('#confirmHotkeyConflict').click();

    // Wait for dialog to close and reset to complete
    await expect(page.locator('#hotkeyConflictDialog.active')).not.toBeVisible();
    await page.waitForTimeout(500);

    // Get count of hotkeys after reset
    const hotkeyCountAfter = await page.locator('.hotkey-item').count();

    // Should have more hotkeys now (default is 28: A-D with gestures + numbers + letters, E-J with numbers + letters)
    expect(hotkeyCountAfter).toBeGreaterThan(hotkeyCountBefore);
    expect(hotkeyCountAfter).toBeGreaterThan(20);
  });

  test('should cancel reset when user declines', async ({ page }) => {
    // Open settings and switch to hotkeys tab
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    // Get count of hotkeys before
    const hotkeyCountBefore = await page.locator('.hotkey-item').count();

    // Click reset button
    await page.locator('#resetHotkeys').click();

    // Wait for confirmation dialog to appear
    await expect(page.locator('#hotkeyConflictDialog.active')).toBeVisible();

    // Click Cancel button
    await page.locator('#cancelHotkeyConflict').click();

    // Wait for dialog to close
    await expect(page.locator('#hotkeyConflictDialog.active')).not.toBeVisible();
    await page.waitForTimeout(300);

    // Get count of hotkeys after
    const hotkeyCountAfter = await page.locator('.hotkey-item').count();

    // Should be the same
    expect(hotkeyCountAfter).toBe(hotkeyCountBefore);
  });

  test('should show toast after resetting hotkeys', async ({ page }) => {
    // Open settings and switch to hotkeys tab
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    // Click reset button
    await page.locator('#resetHotkeys').click();

    // Wait for confirmation dialog and accept
    await expect(page.locator('#hotkeyConflictDialog.active')).toBeVisible();
    await page.locator('#confirmHotkeyConflict').click();
    await expect(page.locator('#hotkeyConflictDialog.active')).not.toBeVisible();

    // Wait for toast
    await page.waitForTimeout(300);

    // Check toast message
    const toast = page.locator('#toast');
    await expect(toast).toBeVisible();
    await expect(toast.locator('#toastMessage')).toContainText('Hotkeys reset to default');
  });
});
