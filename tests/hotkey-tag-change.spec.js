const { test, expect } = require('./test-config');

test.describe('Hotkey Tag Change', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show tag selector on click', async ({ page }) => {
    await page.evaluate(() => {
      const settings = {
        preTagDuration: 10,
        postTagDuration: 2,
        tagLabelCount: 4,
        enabledTags: ['A', 'B', 'C', 'D'],
        hotkeys: [
          { type: 'keyboard', label: 'Ctrl+A', tagLabel: 'A', key: 'a', ctrlKey: true }
        ]
      };
      localStorage.setItem('sportsDashcam_settings', JSON.stringify(settings));
      location.reload();
    });

    await page.waitForLoadState('load');
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    // Click on the tag badge
    await page.locator('.hotkey-item').first().locator('.tag-badge').click();

    // Tag change menu should appear
    const tagChangeMenu = page.locator('#tagChangeMenu');
    await expect(tagChangeMenu).toBeVisible();
  });

  test('should show all available tags in the menu', async ({ page }) => {
    await page.evaluate(() => {
      const settings = {
        preTagDuration: 10,
        postTagDuration: 2,
        tagLabelCount: 4,
        enabledTags: ['A', 'B', 'C', 'D'],
        hotkeys: [
          { type: 'keyboard', label: 'Ctrl+A', tagLabel: 'A', key: 'a', ctrlKey: true }
        ]
      };
      localStorage.setItem('sportsDashcam_settings', JSON.stringify(settings));
      location.reload();
    });

    await page.waitForLoadState('load');
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    await page.locator('.hotkey-item').first().locator('.tag-badge').click();

    // Should show all 4 tag badges
    const tagBadges = page.locator('#tagChangeMenu .tag-change-badge');
    await expect(tagBadges).toHaveCount(4);

    // Check labels
    await expect(tagBadges.nth(0)).toHaveText('A');
    await expect(tagBadges.nth(1)).toHaveText('B');
    await expect(tagBadges.nth(2)).toHaveText('C');
    await expect(tagBadges.nth(3)).toHaveText('D');
  });

  test('should change tag when clicking a badge', async ({ page }) => {
    await page.evaluate(() => {
      const settings = {
        preTagDuration: 10,
        postTagDuration: 2,
        tagLabelCount: 4,
        enabledTags: ['A', 'B', 'C', 'D'],
        hotkeys: [
          { type: 'keyboard', label: 'Ctrl+A', tagLabel: 'A', key: 'a', ctrlKey: true }
        ]
      };
      localStorage.setItem('sportsDashcam_settings', JSON.stringify(settings));
      location.reload();
    });

    await page.waitForLoadState('load');
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    // Verify initial tag is A
    const initialBadge = page.locator('.hotkey-item').first().locator('.tag-badge');
    await expect(initialBadge).toHaveText('A');

    // Right-click and change to tag B
    await page.locator('.hotkey-item').first().locator('.tag-badge').click();
    await page.locator('#tagChangeMenu .tag-change-badge').nth(1).click();

    // Tag should now be B
    const updatedBadge = page.locator('.hotkey-item').first().locator('.tag-badge');
    await expect(updatedBadge).toHaveText('B');
  });

  test('should close menu when clicking outside', async ({ page }) => {
    await page.evaluate(() => {
      const settings = {
        preTagDuration: 10,
        postTagDuration: 2,
        tagLabelCount: 4,
        enabledTags: ['A', 'B', 'C', 'D'],
        hotkeys: [
          { type: 'keyboard', label: 'Ctrl+A', tagLabel: 'A', key: 'a', ctrlKey: true }
        ]
      };
      localStorage.setItem('sportsDashcam_settings', JSON.stringify(settings));
      location.reload();
    });

    await page.waitForLoadState('load');
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    // Open menu
    await page.locator('.hotkey-item').first().locator('.tag-badge').click();
    await expect(page.locator('#tagChangeMenu')).toBeVisible();

    // Wait for click handler to be registered (100ms delay in code)
    await page.waitForTimeout(150);

    // Click outside (on the tab header)
    await page.locator('#hotkeySettingsTab').click();

    // Menu should be hidden
    await expect(page.locator('#tagChangeMenu')).not.toBeVisible();
  });

  test('should close menu when scrolling', async ({ page }) => {
    await page.evaluate(() => {
      const settings = {
        preTagDuration: 10,
        postTagDuration: 2,
        tagLabelCount: 4,
        enabledTags: ['A', 'B', 'C', 'D'],
        hotkeys: [
          { type: 'keyboard', label: 'Ctrl+A', tagLabel: 'A', key: 'a', ctrlKey: true }
        ]
      };
      localStorage.setItem('sportsDashcam_settings', JSON.stringify(settings));
      location.reload();
    });

    await page.waitForLoadState('load');
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    // Open menu
    await page.locator('.hotkey-item').first().locator('.tag-badge').click();
    await expect(page.locator('#tagChangeMenu')).toBeVisible();

    // Wait for click handler to be registered
    await page.waitForTimeout(150);

    // Scroll the hotkey list container
    await page.locator('.tag-hotkeys-list').evaluate(el => {
      el.scrollTop += 10;
      el.dispatchEvent(new Event('scroll', { bubbles: true }));
    });

    // Wait a bit for the scroll event to be processed
    await page.waitForTimeout(50);

    // Menu should be hidden after scroll
    await expect(page.locator('#tagChangeMenu')).not.toBeVisible();
  });

  test('should preserve hotkey data when changing tag', async ({ page }) => {
    await page.evaluate(() => {
      const settings = {
        preTagDuration: 10,
        postTagDuration: 2,
        tagLabelCount: 4,
        enabledTags: ['A', 'B', 'C', 'D'],
        hotkeys: [
          { type: 'keyboard', label: 'Ctrl+Shift+X', tagLabel: 'A', key: 'x', ctrlKey: true, shiftKey: true }
        ]
      };
      localStorage.setItem('sportsDashcam_settings', JSON.stringify(settings));
      location.reload();
    });

    await page.waitForLoadState('load');
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    // Verify initial state
    const hotkeyLabel = page.locator('.hotkey-item').first().locator('.hotkey-label-text');
    await expect(hotkeyLabel).toHaveText('Ctrl+Shift+X');

    // Change tag
    await page.locator('.hotkey-item').first().locator('.tag-badge').click();
    await page.locator('#tagChangeMenu .tag-change-badge').nth(2).click(); // Change to C

    // Hotkey label should remain the same
    await expect(hotkeyLabel).toHaveText('Ctrl+Shift+X');

    // But tag should change to C
    const updatedBadge = page.locator('.hotkey-item').first().locator('.tag-badge');
    await expect(updatedBadge).toHaveText('C');
  });
});
