const { test, expect } = require('./test-config');

test.describe('Hotkey Conflict Detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.sportsDashcamApp && window.sportsDashcamApp.ready);
  });

  test('should detect keyboard hotkey conflict and allow reassignment', async ({ page }) => {
    // Open settings and switch to hotkeys tab
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    // Wait for hotkeys list to render - ensure at least one hotkey item exists
    await page.locator('.hotkey-item').first().waitFor({ state: 'visible', timeout: 2000 });

    // Verify Tag A has KeyA by checking for hotkey-item containing tag badge "A" and label "a"
    const tagAWithA = page.locator('.hotkey-item')
      .filter({ has: page.locator('.tag-badge:has-text("A")') })
      .filter({ has: page.locator('.hotkey-label-text:text-is("a")') });
    await expect(tagAWithA.first()).toBeVisible();

    // Select Tag B by scrolling into view first
    const tagBBadge = page.locator('.tag-selector-badge:has-text("B")');
    await tagBBadge.scrollIntoViewIfNeeded();
    await tagBBadge.click();

    // Click detect hotkey button
    await page.locator('#detectHotkey').click();

    // Wait for detector to appear
    await expect(page.locator('#hotkeyDetector')).toBeVisible();

    // Focus the detector to ensure it receives keyboard events
    await page.locator('#hotkeyDetector').click();

    // Press 'a' key
    await page.keyboard.press('a');

    // Wait for confirm button to appear and click it
    await expect(page.locator('#confirmDetectHotkey')).toBeVisible();
    await page.locator('#confirmDetectHotkey').click();

    // Wait for conflict dialog to appear
    await expect(page.locator('#hotkeyConflictDialog.active')).toBeVisible({ timeout: 5000 });

    // Verify conflict message
    const message = page.locator('#hotkeyConflictMessage');
    await expect(message).toContainText('already assigned to Tag A');
    await expect(message).toContainText('reassign it to Tag B');

    // Click Reassign button
    await page.locator('#confirmHotkeyConflict').click();

    // Wait for dialog to close
    await expect(page.locator('#hotkeyConflictDialog.active')).not.toBeVisible();
    await page.waitForTimeout(500);

    // Verify Tag B now has KeyA (note: manually added hotkeys have uppercase single letter labels)
    const tagBWithA = page.locator('.hotkey-item')
      .filter({ has: page.locator('.tag-badge:has-text("B")') })
      .filter({ has: page.locator('.hotkey-label-text:text-is("A")') }); // uppercase because manually added
    await expect(tagBWithA.first()).toBeVisible();

    // Verify Tag A no longer has KeyA
    const tagAWithAAfter = page.locator('.hotkey-item')
      .filter({ has: page.locator('.tag-badge:has-text("A")') })
      .filter({ has: page.locator('.hotkey-label-text:text-is("a")') });
    const countAfter = await tagAWithAAfter.count();
    expect(countAfter).toBe(0);
  });

  test('should cancel hotkey reassignment when user declines', async ({ page }) => {
    // Open settings and switch to hotkeys tab
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    // Wait for hotkeys list to render
    await page.locator('.hotkey-item').first().waitFor({ state: 'visible', timeout: 2000 });

    // Verify Tag A has KeyA before
    const tagAWithABefore = page.locator('.hotkey-item')
      .filter({ has: page.locator('.tag-badge:has-text("A")') })
      .filter({ has: page.locator('.hotkey-label-text:text-is("a")') });
    await expect(tagAWithABefore.first()).toBeVisible();

    // Select Tag B
    const tagBBadge = page.locator('.tag-selector-badge:has-text("B")');
    await tagBBadge.scrollIntoViewIfNeeded();
    await tagBBadge.click();

    // Click detect hotkey button
    await page.locator('#detectHotkey').click();
    await expect(page.locator('#hotkeyDetector')).toBeVisible();

    // Focus the detector to ensure it receives keyboard events
    await page.locator('#hotkeyDetector').click();

    // Press 'a' key
    await page.keyboard.press('a');

    // Wait for confirm button to appear and click it
    await expect(page.locator('#confirmDetectHotkey')).toBeVisible();
    await page.locator('#confirmDetectHotkey').click();

    // Wait for conflict dialog to appear
    await expect(page.locator('#hotkeyConflictDialog.active')).toBeVisible({ timeout: 5000 });

    // Verify conflict message
    await expect(page.locator('#hotkeyConflictMessage')).toContainText('already assigned to Tag A');

    // Click Cancel button
    await page.locator('#cancelHotkeyConflict').click();

    // Wait for dialog to close
    await expect(page.locator('#hotkeyConflictDialog.active')).not.toBeVisible();
    await page.waitForTimeout(500);

    // Verify Tag A still has KeyA
    const tagAWithAAfter = page.locator('.hotkey-item')
      .filter({ has: page.locator('.tag-badge:has-text("A")') })
      .filter({ has: page.locator('.hotkey-label-text:text-is("a")') });
    await expect(tagAWithAAfter.first()).toBeVisible();

    // Verify Tag B does NOT have KeyA
    const tagBWithA = page.locator('.hotkey-item')
      .filter({ has: page.locator('.tag-badge:has-text("B")') })
      .filter({ has: page.locator('.hotkey-label-text:text-is("a")') });
    const countB = await tagBWithA.count();
    expect(countB).toBe(0);
  });

  test('should detect gesture conflict and allow reassignment', async ({ page }) => {
    // Open settings and switch to hotkeys tab
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();
    await page.waitForTimeout(500);

    // Verify Tag A has Swipe Left by default
    const tagASwipeLeft = page.locator('.hotkey-item').filter({
      has: page.locator('.tag-badge:has-text("A")'),
      hasText: 'Swipe Left'
    });
    await expect(tagASwipeLeft.first()).toBeVisible();

    // Select Tag B
    const tagBBadge = page.locator('.tag-selector-badge:has-text("B")');
    await tagBBadge.scrollIntoViewIfNeeded();
    await tagBBadge.click();

    // Click detect gesture button
    await page.locator('#detectGesture').click();
    await expect(page.locator('#gestureDetector')).toBeVisible();

    // Simulate swipe left gesture
    const detector = page.locator('.detector-overlay');
    const box = await detector.boundingBox();

    // Swipe left: start from right, move to left
    await page.mouse.move(box.x + box.width - 50, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 50, box.y + box.height / 2);
    await page.mouse.up();

    // Wait for detection to process and conflict dialog to appear
    await expect(page.locator('#hotkeyConflictDialog.active')).toBeVisible({ timeout: 5000 });

    // Verify conflict message
    const message = page.locator('#hotkeyConflictMessage');
    await expect(message).toContainText('already assigned to Tag A');
    await expect(message).toContainText('reassign it to Tag B');

    // Click Reassign button
    await page.locator('#confirmHotkeyConflict').click();

    // Wait for dialog to close
    await expect(page.locator('#hotkeyConflictDialog.active')).not.toBeVisible();
    await page.waitForTimeout(500);

    // Verify Tag B now has Swipe Left
    const tagBSwipeLeft = page.locator('.hotkey-item').filter({
      has: page.locator('.tag-badge:has-text("B")'),
      hasText: 'Swipe Left'
    });
    await expect(tagBSwipeLeft.first()).toBeVisible();

    // Verify Tag A no longer has Swipe Left
    const tagASwipeLeftAfter = page.locator('.hotkey-item').filter({
      has: page.locator('.tag-badge:has-text("A")'),
      hasText: 'Swipe Left'
    });
    await expect(tagASwipeLeftAfter).not.toBeVisible();
  });

  test('should allow same hotkey for same tag without conflict', async ({ page }) => {
    // Open settings and switch to hotkeys tab
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    // Wait for hotkeys list to render
    await page.locator('.hotkey-item').first().waitFor({ state: 'visible', timeout: 2000 });

    // Count all Tag A hotkeys before (not just lowercase 'a')
    const countBefore = await page.locator('.hotkey-item')
      .filter({ has: page.locator('.tag-badge:has-text("A")') })
      .count();

    // Select Tag A (same tag)
    const tagABadge = page.locator('.tag-selector-badge:has-text("A")');
    await tagABadge.scrollIntoViewIfNeeded();
    await tagABadge.click();

    // Click detect hotkey button
    await page.locator('#detectHotkey').click();
    await expect(page.locator('#hotkeyDetector')).toBeVisible();

    // Focus the detector to ensure it receives keyboard events
    await page.locator('#hotkeyDetector').click();

    // Press 'a' key (already assigned to Tag A)
    await page.keyboard.press('a');

    // Wait for confirm button to appear and click it
    await expect(page.locator('#confirmDetectHotkey')).toBeVisible();
    await page.locator('#confirmDetectHotkey').click();

    // Wait for detection to complete
    await page.waitForTimeout(500);

    // Verify no conflict dialog appeared (since it's the same tag)
    await expect(page.locator('#hotkeyConflictDialog.active')).not.toBeVisible();

    // Verify Tag A total hotkeys increased by 1 (duplicate allowed for same tag)
    const countAfter = await page.locator('.hotkey-item')
      .filter({ has: page.locator('.tag-badge:has-text("A")') })
      .count();
    expect(countAfter).toBe(countBefore + 1);
  });

  test('should detect modifier key conflicts', async ({ page }) => {
    // Open settings and switch to hotkeys tab
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    // Wait for hotkeys list to render
    await page.locator('.hotkey-item').first().waitFor({ state: 'visible', timeout: 2000 });

    // Select Tag A and add Ctrl+A
    const tagABadge = page.locator('.tag-selector-badge:has-text("A")');
    await tagABadge.scrollIntoViewIfNeeded();
    await tagABadge.click();
    await page.locator('#detectHotkey').click();
    await expect(page.locator('#hotkeyDetector')).toBeVisible();

    // Focus the detector to ensure it receives keyboard events
    await page.locator('#hotkeyDetector').click();

    // Press Ctrl+A
    await page.keyboard.press('Control+a');

    // Wait for confirm button to appear and click it
    await expect(page.locator('#confirmDetectHotkey')).toBeVisible();
    await page.locator('#confirmDetectHotkey').click();

    // Wait for hotkey to be added
    await page.waitForTimeout(500);

    // Verify Tag A now has Ctrl+A
    const tagACtrlA = page.locator('.hotkey-item').filter({
      has: page.locator('.tag-badge:has-text("A")'),
      hasText: 'Ctrl+a'
    });
    await expect(tagACtrlA.first()).toBeVisible();

    // Now try to assign Ctrl+A to Tag B
    const tagBBadge = page.locator('.tag-selector-badge:has-text("B")');
    await tagBBadge.scrollIntoViewIfNeeded();
    await tagBBadge.click();
    await page.locator('#detectHotkey').click();
    await expect(page.locator('#hotkeyDetector')).toBeVisible();

    // Focus the detector to ensure it receives keyboard events
    await page.locator('#hotkeyDetector').click();

    // Press Ctrl+A again
    await page.keyboard.press('Control+a');

    // Wait for confirm button to appear and click it
    await expect(page.locator('#confirmDetectHotkey')).toBeVisible();
    await page.locator('#confirmDetectHotkey').click();

    // Wait for conflict dialog to appear
    await expect(page.locator('#hotkeyConflictDialog.active')).toBeVisible({ timeout: 5000 });

    // Verify conflict message
    const message = page.locator('#hotkeyConflictMessage');
    await expect(message).toContainText('already assigned to Tag A');
    await expect(message).toContainText('Ctrl+A'); // uppercase A in the label

    // Click Reassign button
    await page.locator('#confirmHotkeyConflict').click();

    // Wait for dialog to close
    await expect(page.locator('#hotkeyConflictDialog.active')).not.toBeVisible();
    await page.waitForTimeout(500);

    // Verify Tag B has Ctrl+A
    const tagBCtrlA = page.locator('.hotkey-item').filter({
      has: page.locator('.tag-badge:has-text("B")'),
      hasText: 'Ctrl+a'
    });
    await expect(tagBCtrlA.first()).toBeVisible();
  });
});
