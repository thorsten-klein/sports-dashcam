const { test, expect } = require('./test-config');

test.describe('Hotkey List Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForFunction(() => window.sportsDashcamApp && window.sportsDashcamApp.ready);
  });

  test('should display hotkeys in a two-column list sorted by tag label', async ({ page }) => {
    // Open settings
    await page.locator('#settingsBtn').click();

    // Switch to hotkey settings tab
    await page.locator('#hotkeySettingsTab').click();

    // Add some hotkeys via localStorage
    await page.evaluate(() => {
      const settings = {
        preTagDuration: 10,
        postTagDuration: 2,
        tagLabelCount: 4,
        enabledTags: ['A', 'B', 'C', 'D'],
        hotkeys: [
          { type: 'keyboard', label: 'Ctrl+D', tagLabel: 'D', key: 'd', ctrlKey: true },
          { type: 'keyboard', label: 'Ctrl+A', tagLabel: 'A', key: 'a', ctrlKey: true },
          { type: 'gesture', label: 'Swipe Right', tagLabel: 'C', gestureType: 'swipe', direction: 'right' },
          { type: 'keyboard', label: 'Ctrl+B', tagLabel: 'B', key: 'b', ctrlKey: true }
        ]
      };
      localStorage.setItem('sportsDashcam_settings', JSON.stringify(settings));
      location.reload();
    });

    // Wait for reload and app initialization
    await page.waitForLoadState('load');
    await page.waitForFunction(() => window.sportsDashcamApp && window.sportsDashcamApp.ready);

    // Open settings again
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    // Check that hotkeys are displayed in sorted order (A, B, C, D)
    const hotkeyItems = page.locator('.hotkey-item');
    await expect(hotkeyItems).toHaveCount(4);

    // First item should be tag A
    const firstItem = hotkeyItems.nth(0);
    await expect(firstItem.locator('.tag-badge')).toHaveText('A');
    await expect(firstItem.locator('.hotkey-label-text')).toHaveText('Ctrl+A');

    // Second item should be tag B
    const secondItem = hotkeyItems.nth(1);
    await expect(secondItem.locator('.tag-badge')).toHaveText('B');
    await expect(secondItem.locator('.hotkey-label-text')).toHaveText('Ctrl+B');

    // Third item should be tag C
    const thirdItem = hotkeyItems.nth(2);
    await expect(thirdItem.locator('.tag-badge')).toHaveText('C');
    await expect(thirdItem.locator('.hotkey-label-text')).toHaveText('Swipe Right');

    // Fourth item should be tag D
    const fourthItem = hotkeyItems.nth(3);
    await expect(fourthItem.locator('.tag-badge')).toHaveText('D');
    await expect(fourthItem.locator('.hotkey-label-text')).toHaveText('Ctrl+D');
  });

  test('should display tag badges with correct colors', async ({ page }) => {
    await page.evaluate(() => {
      const settings = {
        preTagDuration: 10,
        postTagDuration: 2,
        tagLabelCount: 4,
        enabledTags: ['A', 'B', 'C', 'D'],
        hotkeys: [
          { type: 'keyboard', label: 'Ctrl+A', tagLabel: 'A', key: 'a', ctrlKey: true },
          { type: 'keyboard', label: 'Ctrl+B', tagLabel: 'B', key: 'b', ctrlKey: true }
        ]
      };
      localStorage.setItem('sportsDashcam_settings', JSON.stringify(settings));
      location.reload();
    });

    await page.waitForLoadState('load');
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    // Check tag A color (red)
    const tagABadge = page.locator('.hotkey-item').nth(0).locator('.tag-badge');
    const tagAColor = await tagABadge.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(tagAColor).toBe('rgb(244, 67, 54)'); // #F44336

    // Check tag B color (blue)
    const tagBBadge = page.locator('.hotkey-item').nth(1).locator('.tag-badge');
    const tagBColor = await tagBBadge.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(tagBColor).toBe('rgb(33, 150, 243)'); // #2196F3
  });

  test('each hotkey item should have a delete button', async ({ page }) => {
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

    const hotkeyItem = page.locator('.hotkey-item').first();
    const deleteBtn = hotkeyItem.locator('.hotkey-delete');

    await expect(deleteBtn).toBeVisible();
    await expect(deleteBtn.locator('.material-icons')).toHaveText('delete');
  });

  test('should not display duplicate hotkeys', async ({ page }) => {
    await page.evaluate(() => {
      const settings = {
        preTagDuration: 10,
        postTagDuration: 2,
        tagLabelCount: 4,
        enabledTags: ['A', 'B', 'C', 'D'],
        hotkeys: [
          { type: 'keyboard', label: 'Ctrl+A', tagLabel: 'A', key: 'a', ctrlKey: true },
          { type: 'keyboard', label: 'Ctrl+A', tagLabel: 'A', key: 'a', ctrlKey: true }, // duplicate
          { type: 'keyboard', label: 'Ctrl+B', tagLabel: 'B', key: 'b', ctrlKey: true }
        ]
      };
      localStorage.setItem('sportsDashcam_settings', JSON.stringify(settings));
      location.reload();
    });

    await page.waitForLoadState('load');
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    // Should only show 2 hotkeys (duplicate removed)
    const hotkeyItems = page.locator('.hotkey-item');
    await expect(hotkeyItems).toHaveCount(2);
  });

  test('should display keyboard and gesture icons correctly', async ({ page }) => {
    await page.evaluate(() => {
      const settings = {
        preTagDuration: 10,
        postTagDuration: 2,
        tagLabelCount: 4,
        enabledTags: ['A', 'B', 'C', 'D'],
        hotkeys: [
          { type: 'keyboard', label: 'Ctrl+A', tagLabel: 'A', key: 'a', ctrlKey: true },
          { type: 'gesture', label: 'Swipe Right', tagLabel: 'B', gestureType: 'swipe', direction: 'right' }
        ]
      };
      localStorage.setItem('sportsDashcam_settings', JSON.stringify(settings));
      location.reload();
    });

    await page.waitForLoadState('load');
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    // First item (keyboard) should have keyboard icon
    const keyboardIcon = page.locator('.hotkey-item').nth(0).locator('.hotkey-type-icon');
    await expect(keyboardIcon).toHaveText('keyboard');

    // Second item (gesture) should have gesture icon
    const gestureIcon = page.locator('.hotkey-item').nth(1).locator('.hotkey-type-icon');
    await expect(gestureIcon).toHaveText('gesture');
  });

  test('deleting a hotkey should remove it from the list', async ({ page }) => {
    await page.evaluate(() => {
      const settings = {
        preTagDuration: 10,
        postTagDuration: 2,
        tagLabelCount: 4,
        enabledTags: ['A', 'B', 'C', 'D'],
        hotkeys: [
          { type: 'keyboard', label: 'Ctrl+A', tagLabel: 'A', key: 'a', ctrlKey: true },
          { type: 'keyboard', label: 'Ctrl+B', tagLabel: 'B', key: 'b', ctrlKey: true }
        ]
      };
      localStorage.setItem('sportsDashcam_settings', JSON.stringify(settings));
      location.reload();
    });

    await page.waitForLoadState('load');
    await page.locator('#settingsBtn').click();
    await page.locator('#hotkeySettingsTab').click();

    // Initially 2 hotkeys
    await expect(page.locator('.hotkey-item')).toHaveCount(2);

    // Delete the first hotkey
    await page.locator('.hotkey-item').first().locator('.hotkey-delete').click();

    // Should now have 1 hotkey
    await expect(page.locator('.hotkey-item')).toHaveCount(1);

    // Remaining hotkey should be tag B
    await expect(page.locator('.hotkey-item').first().locator('.tag-badge')).toHaveText('B');
  });
});
