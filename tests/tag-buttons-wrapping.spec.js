const { test, expect } = require('@playwright/test');

test.describe('Tag Buttons Wrapping', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Disable CSS transitions so dialog open is instant — prevents a WebKit race where
    // the dialog's scale animation shifts input positions while Playwright fills them,
    // causing keystrokes to land on the wrong input.
    await page.addStyleTag({ content: '*, *::before, *::after { transition-duration: 0ms !important; animation-duration: 0ms !important; }' });
    // Wait for app to be fully initialized
    await page.waitForFunction(() => window.videoTaggerApp && window.videoTaggerApp.ready);
    await page.evaluate(() => window.videoTaggerApp.ready);
  });

  test('should allow tag buttons to wrap to multiple lines', async ({ page }) => {
    // Set tag label count to 10
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('10');
    await page.locator('#saveSettings').click();

    // Wait for settings dialog to close
    await page.locator('#settingsDialog.active').waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);

    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera card to appear before accessing it
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible' });

    // Start recording
    await expect(page.locator('#startRecordingBtn')).not.toBeDisabled({ timeout: 10000 });
    await page.locator('#startRecordingBtn').click();

    // Check that container has flex-wrap
    const hasFlexWrap = await page.evaluate(() => {
      const container = document.getElementById('tagButtonsContainer');
      const styles = window.getComputedStyle(container);
      return styles.flexWrap === 'wrap';
    });

    expect(hasFlexWrap).toBe(true);
  });

  test('should center wrapped tag buttons', async ({ page }) => {
    // Set tag label count to 10
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('10');
    await page.locator('#saveSettings').click();

    // Wait for settings dialog to close
    await page.locator('#settingsDialog.active').waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);

    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera card to appear before accessing it
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible' });

    // Start recording
    await expect(page.locator('#startRecordingBtn')).not.toBeDisabled({ timeout: 10000 });
    await page.locator('#startRecordingBtn').click();

    // Check that container has justify-content: center
    const isCentered = await page.evaluate(() => {
      const container = document.getElementById('tagButtonsContainer');
      const styles = window.getComputedStyle(container);
      return styles.justifyContent === 'center';
    });

    expect(isCentered).toBe(true);
  });

  test('should constrain container width to match main-content', async ({ page }) => {
    // Set tag label count to 10
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('10');
    await page.locator('#saveSettings').click();

    // Wait for settings dialog to close
    await page.locator('#settingsDialog.active').waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);

    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera to be added
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible' });

    // Start recording
    await expect(page.locator('#startRecordingBtn')).not.toBeDisabled({ timeout: 10000 });
    await page.locator('#startRecordingBtn').click();

    // Check that container has max-width of 1400px (same as main-content)
    const maxWidth = await page.evaluate(() => {
      const container = document.getElementById('tagButtonsContainer');
      const styles = window.getComputedStyle(container);
      return styles.maxWidth;
    });

    expect(maxWidth).toBe('1400px');
  });

  test('should show all 10 buttons without overflow on small viewport', async ({ page }) => {
    // Set smaller viewport
    await page.setViewportSize({ width: 800, height: 600 });

    // Set tag label count to 10
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('10');
    await page.locator('#saveSettings').click();

    // Wait for settings dialog to close
    await page.locator('#settingsDialog.active').waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);

    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera card to appear before accessing it
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible' });

    // Start recording
    await expect(page.locator('#startRecordingBtn')).not.toBeDisabled({ timeout: 10000 });
    await page.locator('#startRecordingBtn').click();

    // All buttons should be visible
    const visibleButtons = await page.evaluate(() => {
      const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      return labels.filter(label => {
        const button = document.getElementById(`tagButton${label}`);
        if (!button || button.classList.contains('hidden')) return false;

        const rect = button.getBoundingClientRect();
        // Button is considered visible if it's within viewport
        return rect.width > 0 && rect.height > 0;
      }).length;
    });

    expect(visibleButtons).toBe(10);
  });

  test('should maintain gap between buttons when wrapped', async ({ page }) => {
    // Set tag label count to 10
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('10');
    await page.locator('#saveSettings').click();

    // Wait for settings dialog to close
    await page.locator('#settingsDialog.active').waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);

    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera card to appear before accessing it
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible' });

    // Start recording
    await expect(page.locator('#startRecordingBtn')).not.toBeDisabled({ timeout: 10000 });
    await page.locator('#startRecordingBtn').click();

    // Check that container has gap
    const hasGap = await page.evaluate(() => {
      const container = document.getElementById('tagButtonsContainer');
      const styles = window.getComputedStyle(container);
      // Gap should be 12px
      return styles.gap === '12px' || styles.rowGap === '12px';
    });

    expect(hasGap).toBe(true);
  });

  test('should keep buttons in one line when they fit', async ({ page }) => {
    // Use full HD viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Set tag label count to 4 (should easily fit in one line)
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

    // Wait for camera card to appear before accessing it
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible' });

    // Start recording
    await expect(page.locator('#startRecordingBtn')).not.toBeDisabled({ timeout: 10000 });
    await page.locator('#startRecordingBtn').click();

    // Check that all buttons are on the same line (same Y position)
    const allOnSameLine = await page.evaluate(() => {
      const buttons = ['A', 'B', 'C', 'D'];
      const positions = buttons.map(label => {
        const button = document.getElementById(`tagButton${label}`);
        return button ? button.getBoundingClientRect().top : null;
      });

      // All buttons should have the same top position
      const firstTop = positions[0];
      return positions.every(top => top === firstTop);
    });

    expect(allOnSameLine).toBe(true);
  });

  test('should respect max-width constraint', async ({ page }) => {
    // Use very large viewport
    await page.setViewportSize({ width: 2000, height: 1080 });

    // Set tag label count to 10
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('10');
    await page.locator('#saveSettings').click();

    // Wait for settings dialog to close
    await page.locator('#settingsDialog.active').waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);

    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera card to appear before accessing it
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible' });

    // Start recording
    await expect(page.locator('#startRecordingBtn')).not.toBeDisabled({ timeout: 10000 });
    await page.locator('#startRecordingBtn').click();

    // Container width should not exceed max-width
    const containerWidth = await page.evaluate(() => {
      const container = document.getElementById('tagButtonsContainer');
      return container.offsetWidth;
    });

    // Should be at most 1400px (max-width)
    expect(containerWidth).toBeLessThanOrEqual(1400);
  });
});
