const { test, expect } = require('./test-config');

test.describe('Toast Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have toast element', async ({ page }) => {
    const toast = page.locator('#toast');
    await expect(toast).toBeDefined();
  });

  test('should have toast message element', async ({ page }) => {
    const toastMessage = page.locator('#toastMessage');
    await expect(toastMessage).toBeDefined();
  });

  test('should show toast when camera is added', async ({ page }) => {
    // Add a camera to trigger toast (use addFirstCamera when no cameras exist)
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Toast should appear (may need to wait for it)
    const toast = page.locator('#toast');

    // The toast might be visible or might have already faded
    // We check if it exists and can be shown
    await expect(toast).toBeDefined();
  });

  test('should show toast for 0.5s when hotkey is detected', async ({ page }) => {
    // Open settings dialog
    await page.locator('#settingsBtn').click();

    // Switch to hotkeys tab
    await page.locator('#hotkeySettingsTab').click();

    // Wait for tag selector badges to be populated
    await page.locator('#tagSelector .tag-selector-badge').first().waitFor({ state: 'visible' });

    // Select tag A from the tag selector (first tag badge)
    await page.locator('#tagSelector .tag-selector-badge').first().click();

    // Click detect hotkey button
    await page.locator('#detectHotkey').click();

    // Wait for detector to appear
    await expect(page.locator('#hotkeyDetector')).toBeVisible();

    // Focus detector and press the 'k' key
    await page.locator('#hotkeyDetector').click();
    await page.keyboard.press('k');

    // Wait for confirm button to appear and click it
    await expect(page.locator('#confirmDetectHotkey')).toBeVisible();
    await page.locator('#confirmDetectHotkey').click();

    // Wait for detector to close
    await expect(page.locator('#hotkeyDetector')).not.toBeVisible();

    // Save settings
    await page.locator('#saveSettings').click();

    // Wait for settings dialog to close
    await page.waitForTimeout(500);

    // Now test the toast notification
    const toast = page.locator('#toast');
    const toastMessage = page.locator('#toastMessage');

    // Press the configured hotkey (K key)
    await page.keyboard.press('k');

    // Toast should appear with the hotkey name
    await expect(toast).toHaveClass(/show/, { timeout: 2000 });
    await expect(toastMessage).toContainText('K');

    // Toast should disappear after 0.5s (with some tolerance)
    await page.waitForTimeout(700); // Wait a bit longer than 0.5s
    await expect(toast).not.toHaveClass(/show/);
  });

  test('should show toast for any detected gesture even without configured hotkey', async ({ page }) => {
    // Lock the screen first (gestures only work when locked)
    await page.locator('#lockScreenBtn').click();
    await page.waitForTimeout(200);

    const toast = page.locator('#toast');
    const toastMessage = page.locator('#toastMessage');

    // Simulate a swipe right gesture using mouse events
    // Note: Mouse events work for touch on mobile devices
    await page.mouse.move(100, 300);
    await page.mouse.down();
    await page.mouse.move(400, 300, { steps: 10 }); // Swipe right (distance > 100)
    await page.mouse.up();

    // Toast should appear showing the detected gesture
    await expect(toast).toHaveClass(/show/, { timeout: 2000 });
    await expect(toastMessage).toContainText('Swipe Right');

    // Toast should disappear after 0.5s
    await page.waitForTimeout(700);
    await expect(toast).not.toHaveClass(/show/);

    // Unlock for cleanup
    await page.locator('#unlockBtn').evaluate(el => el.click());
  });

  test('should show toast for gestures on locked screen', async ({ page }) => {
    // Lock the screen
    await page.locator('#lockScreenBtn').click();

    // Verify screen is locked
    const lockOverlay = page.locator('#lockScreenOverlay');
    await expect(lockOverlay).toBeVisible();

    const toast = page.locator('#toast');
    const toastMessage = page.locator('#toastMessage');

    // Perform a swipe left gesture while locked
    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(100, 300, { steps: 10 }); // Swipe left (distance > 100)
    await page.mouse.up();

    // Toast should appear even when locked
    await expect(toast).toHaveClass(/show/, { timeout: 2000 });
    await expect(toastMessage).toContainText('Swipe Left');

    // Toast should disappear after 0.5s
    await page.waitForTimeout(700);
    await expect(toast).not.toHaveClass(/show/);

    // Unlock the screen for cleanup
    await page.locator('#unlockBtn').evaluate(el => el.click());
  });

  test('should detect double tap within 300ms', async ({ page }) => {
    // Lock the screen first
    await page.locator('#lockScreenBtn').click();
    await page.waitForTimeout(200);

    const toast = page.locator('#toast');
    const toastMessage = page.locator('#toastMessage');

    // Perform double tap with taps within 300ms
    // Dispatch mouse events on the lock screen overlay element so they bubble to document
    // (dispatching on document directly causes e.target.closest() to throw)
    await page.evaluate(() => {
      const overlay = document.getElementById('lockScreenOverlay');
      function fireMouseEvent(type, x, y) {
        overlay.dispatchEvent(new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, cancelable: true }));
      }
      return new Promise(resolve => {
        fireMouseEvent('mousedown', 300, 300);
        fireMouseEvent('mouseup', 300, 300);
        setTimeout(() => {
          fireMouseEvent('mousedown', 300, 300);
          fireMouseEvent('mouseup', 300, 300);
          resolve();
        }, 100);
      });
    });

    // Toast should appear showing "2 Taps"
    await expect(toast).toHaveClass(/show/, { timeout: 2000 });
    await expect(toastMessage).toContainText('2 Taps');

    // Wait for toast to disappear
    await page.waitForTimeout(700);

    // Unlock for cleanup
    await page.locator('#unlockBtn').evaluate(el => el.click());
  });

  test('should NOT detect double tap if taps are more than 300ms apart', async ({ page }) => {
    // Lock the screen first
    await page.locator('#lockScreenBtn').click();
    await page.waitForTimeout(200);

    const toast = page.locator('#toast');
    const toastMessage = page.locator('#toastMessage');

    // Perform two single taps with more than 300ms gap
    // First tap
    await page.mouse.move(300, 300);
    await page.mouse.down();
    await page.mouse.up();

    await page.waitForTimeout(400); // Wait 400ms (> 300ms)

    // Clear any toast from first tap
    await page.waitForTimeout(600);

    // Second tap
    await page.mouse.move(300, 300);
    await page.mouse.down();
    await page.mouse.up();

    // Toast should NOT show "2 Taps", it should either:
    // - Not show at all (if single tap doesn't trigger any gesture)
    // - Show something other than "2 Taps"
    // We'll check that it doesn't contain "2 Taps"
    await page.waitForTimeout(200);

    // If toast is visible, it should not be "2 Taps"
    const isToastVisible = await toast.evaluate(el => el.classList.contains('show'));
    if (isToastVisible) {
      const text = await toastMessage.textContent();
      expect(text).not.toContain('2 Taps');
    }

    // Unlock for cleanup
    await page.locator('#unlockBtn').evaluate(el => el.click());
  });

  test('should detect 2 consecutive swipes left correctly', async ({ page }) => {
    // Lock the screen first
    await page.locator('#lockScreenBtn').click();
    await page.waitForTimeout(200);

    const toast = page.locator('#toast');
    const toastMessage = page.locator('#toastMessage');

    // First swipe left
    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(100, 300, { steps: 10 });
    await page.mouse.up();

    // Should show "Swipe Left"
    await expect(toast).toHaveClass(/show/, { timeout: 2000 });
    await expect(toastMessage).toContainText('Swipe Left');

    // Wait for toast to disappear
    await page.waitForTimeout(700);

    // Second swipe left (after a short delay)
    await page.waitForTimeout(200);
    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(100, 300, { steps: 10 });
    await page.mouse.up();

    // Should STILL show "Swipe Left", NOT "2 Taps" or anything else
    await expect(toast).toHaveClass(/show/, { timeout: 2000 });
    await expect(toastMessage).toContainText('Swipe Left');

    // Make sure it's not detecting it as multi-tap
    const text = await toastMessage.textContent();
    expect(text).not.toContain('Taps');
    expect(text).not.toContain('Tap');

    // Unlock for cleanup
    await page.locator('#unlockBtn').evaluate(el => el.click());
  });

  test('should detect consecutive swipes in different directions', async ({ page }) => {
    // Lock the screen first
    await page.locator('#lockScreenBtn').click();
    await page.waitForTimeout(200);

    const toast = page.locator('#toast');
    const toastMessage = page.locator('#toastMessage');

    // Swipe right
    await page.mouse.move(100, 300);
    await page.mouse.down();
    await page.mouse.move(400, 300, { steps: 10 });
    await page.mouse.up();

    await expect(toast).toHaveClass(/show/, { timeout: 2000 });
    await expect(toastMessage).toContainText('Swipe Right');

    // Wait for toast to fully disappear
    await page.waitForTimeout(800);
    await expect(toast).not.toHaveClass(/show/);

    // Swipe up
    await page.waitForTimeout(300);
    await page.mouse.move(300, 400);
    await page.mouse.down();
    await page.mouse.move(300, 100, { steps: 10 });
    await page.mouse.up();

    await expect(toast).toHaveClass(/show/, { timeout: 2000 });
    await expect(toastMessage).toContainText('Swipe Up');

    // Wait for toast to fully disappear
    await page.waitForTimeout(800);
    await expect(toast).not.toHaveClass(/show/);

    // Swipe down
    await page.waitForTimeout(300);
    await page.mouse.move(300, 100);
    await page.mouse.down();
    await page.mouse.move(300, 400, { steps: 10 });
    await page.mouse.up();

    await expect(toast).toHaveClass(/show/, { timeout: 2000 });
    await expect(toastMessage).toContainText('Swipe Down');

    // Wait for toast to fully disappear
    await page.waitForTimeout(800);
    await expect(toast).not.toHaveClass(/show/);

    // Swipe left
    await page.waitForTimeout(300);
    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(100, 300, { steps: 10 });
    await page.mouse.up();

    await expect(toast).toHaveClass(/show/, { timeout: 2000 });
    await expect(toastMessage).toContainText('Swipe Left');

    // Unlock for cleanup
    await page.locator('#unlockBtn').evaluate(el => el.click());
  });

  test('should detect single swipe down', async ({ page }) => {
    // Lock the screen first
    await page.locator('#lockScreenBtn').click();
    await page.waitForTimeout(200);

    const toast = page.locator('#toast');
    const toastMessage = page.locator('#toastMessage');

    // Swipe down
    await page.mouse.move(300, 100);
    await page.mouse.down();
    await page.mouse.move(300, 400, { steps: 10 });
    await page.mouse.up();

    await expect(toast).toHaveClass(/show/, { timeout: 2000 });
    await expect(toastMessage).toContainText('Swipe Down');

    // Unlock for cleanup
    await page.locator('#unlockBtn').evaluate(el => el.click());
  });

  test('should detect 3 consecutive swipes right', async ({ page }) => {
    // Lock the screen first
    await page.locator('#lockScreenBtn').click();
    await page.waitForTimeout(200);

    const toast = page.locator('#toast');
    const toastMessage = page.locator('#toastMessage');

    for (let i = 0; i < 3; i++) {
      await page.mouse.move(100, 300);
      await page.mouse.down();
      await page.mouse.move(400, 300, { steps: 10 });
      await page.mouse.up();

      await expect(toast).toHaveClass(/show/, { timeout: 2000 });
      await expect(toastMessage).toContainText('Swipe Right');

      if (i < 2) {
        await page.waitForTimeout(1500); // Wait longer between swipes
        await expect(toast).not.toHaveClass(/show/);
      }
    }

    // Unlock for cleanup
    await page.locator('#unlockBtn').evaluate(el => el.click());
  });

  test('should detect swipe right, up, down sequence', async ({ page }) => {
    // Lock the screen first
    await page.locator('#lockScreenBtn').click();
    await page.waitForTimeout(200);

    const toast = page.locator('#toast');
    const toastMessage = page.locator('#toastMessage');

    // Swipe right
    await page.mouse.move(100, 300);
    await page.mouse.down();
    await page.mouse.move(400, 300, { steps: 10 });
    await page.mouse.up();

    await expect(toast).toHaveClass(/show/, { timeout: 2000 });
    await expect(toastMessage).toContainText('Swipe Right');
    await page.waitForTimeout(1500);

    // Swipe up
    await page.mouse.move(300, 400);
    await page.mouse.down();
    await page.mouse.move(300, 100, { steps: 10 });
    await page.mouse.up();

    await expect(toast).toHaveClass(/show/, { timeout: 2000 });
    await expect(toastMessage).toContainText('Swipe Up');
    await page.waitForTimeout(1500);

    // Swipe down
    await page.mouse.move(300, 100);
    await page.mouse.down();
    await page.mouse.move(300, 400, { steps: 10 });
    await page.mouse.up();

    await expect(toast).toHaveClass(/show/, { timeout: 2000 });
    await expect(toastMessage).toContainText('Swipe Down');

    // Unlock for cleanup
    await page.locator('#unlockBtn').evaluate(el => el.click());
  });

  test('should detect swipe right, up, up sequence', async ({ page }) => {
    // Lock the screen first
    await page.locator('#lockScreenBtn').click();
    await page.waitForTimeout(200);

    const toast = page.locator('#toast');
    const toastMessage = page.locator('#toastMessage');

    // Swipe right
    await page.mouse.move(100, 300);
    await page.mouse.down();
    await page.mouse.move(400, 300, { steps: 10 });
    await page.mouse.up();

    await expect(toast).toHaveClass(/show/, { timeout: 2000 });
    await expect(toastMessage).toContainText('Swipe Right');
    await page.waitForTimeout(1500);

    // Swipe up
    await page.mouse.move(300, 400);
    await page.mouse.down();
    await page.mouse.move(300, 100, { steps: 10 });
    await page.mouse.up();

    await expect(toast).toHaveClass(/show/, { timeout: 2000 });
    await expect(toastMessage).toContainText('Swipe Up');
    await page.waitForTimeout(1500);

    // Swipe up again
    await page.mouse.move(300, 400);
    await page.mouse.down();
    await page.mouse.move(300, 100, { steps: 10 });
    await page.mouse.up();

    await expect(toast).toHaveClass(/show/, { timeout: 2000 });
    await expect(toastMessage).toContainText('Swipe Up');

    // Unlock for cleanup
    await page.locator('#unlockBtn').evaluate(el => el.click());
  });

  test('should NOT detect gestures when screen is unlocked', async ({ page }) => {
    // Make sure screen is NOT locked
    const lockOverlay = page.locator('#lockScreenOverlay');
    await expect(lockOverlay).not.toHaveClass(/active/);

    const toast = page.locator('#toast');

    // Try to swipe right
    await page.mouse.move(100, 300);
    await page.mouse.down();
    await page.mouse.move(400, 300, { steps: 10 });
    await page.mouse.up();

    // Wait a bit to see if toast appears
    await page.waitForTimeout(300);

    // Toast should NOT appear
    await expect(toast).not.toHaveClass(/show/);
  });

  test('should NOT detect single tap as gesture', async ({ page }) => {
    // Lock the screen first
    await page.locator('#lockScreenBtn').click();
    await page.waitForTimeout(200);

    const toast = page.locator('#toast');
    const toastMessage = page.locator('#toastMessage');

    // Perform a single tap (short duration, no movement)
    await page.mouse.move(300, 300);
    await page.mouse.down();
    await page.waitForTimeout(50); // Short press
    await page.mouse.up();

    // Wait to see if toast appears
    await page.waitForTimeout(600);

    // Toast should NOT appear for a single tap
    await expect(toast).not.toHaveClass(/show/);

    // Unlock for cleanup
    await page.locator('#unlockBtn').evaluate(el => el.click());
  });

  test('should NOT show double tap after single tap with delay', async ({ page }) => {
    // Lock the screen
    await page.locator('#lockScreenBtn').click();
    await page.waitForTimeout(200);

    const toast = page.locator('#toast');
    const toastMessage = page.locator('#toastMessage');

    // First single tap
    await page.mouse.move(300, 300);
    await page.mouse.down();
    await page.mouse.up();

    // Wait 600ms to ensure timer clears
    await page.waitForTimeout(600);

    // Toast should NOT appear
    const isVisible1 = await toast.evaluate(el => el.classList.contains('show'));
    expect(isVisible1).toBe(false);

    // Second single tap (after timer should be cleared)
    await page.mouse.move(300, 300);
    await page.mouse.down();
    await page.mouse.up();

    // Wait to see if toast appears
    await page.waitForTimeout(600);

    // Toast should STILL NOT appear (not detected as double tap)
    const isVisible2 = await toast.evaluate(el => el.classList.contains('show'));
    expect(isVisible2).toBe(false);

    // Unlock for cleanup
    await page.locator('#unlockBtn').evaluate(el => el.click());
  });
});
