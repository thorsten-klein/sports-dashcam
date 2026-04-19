const { test, expect } = require('./test-config');

test.describe('Tag Count Change', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should show correct enabled/disabled badges when changing tag count before saving', async ({ page }) => {
    // Start with default 4 tags
    await page.evaluate(() => {
      const settings = {
        preTagDuration: 10,
        postTagDuration: 2,
        tagLabelCount: 4,
        enabledTags: ['A', 'B', 'C', 'D'],
        hotkeys: [
          { type: 'keyboard', label: 'a', tagLabel: 'A', key: 'a', ctrlKey: false },
          { type: 'keyboard', label: 'b', tagLabel: 'B', key: 'b', ctrlKey: false },
          { type: 'keyboard', label: 'e', tagLabel: 'E', key: 'e', ctrlKey: false },
          { type: 'keyboard', label: 'f', tagLabel: 'F', key: 'f', ctrlKey: false }
        ]
      };
      localStorage.setItem('sportsDashcam_settings', JSON.stringify(settings));
      location.reload();
    });

    await page.waitForLoadState('load');
    await page.locator('#settingsBtn').click();

    // Change tag count to 8 in General Settings
    await page.locator('#generalSettingsTab').click();
    await page.locator('#tagLabelCount').fill('8');

    // Switch to Hotkeys tab
    await page.locator('#hotkeySettingsTab').click();

    // Tag selector should show 8 badges
    const tagSelectorBadges = page.locator('#tagSelector .tag-selector-badge');
    await expect(tagSelectorBadges).toHaveCount(8);

    // Check hotkey list - find items by tag badge
    const hotkeyItems = page.locator('.hotkey-item');
    const itemCount = await hotkeyItems.count();

    for (let i = 0; i < itemCount; i++) {
      const item = hotkeyItems.nth(i);
      const tagBadgeText = await item.locator('.tag-badge').textContent();

      // A, B, E, F should all be enabled (within count of 8)
      if (['A', 'B', 'E', 'F'].includes(tagBadgeText)) {
        const disabledBadge = item.locator('.disabled-badge');
        const isVisible = await disabledBadge.isVisible().catch(() => false);
        expect(isVisible).toBe(false);
      }
    }
  });

  test('should show disabled badges for tags beyond the current count', async ({ page }) => {
    await page.evaluate(() => {
      const settings = {
        preTagDuration: 10,
        postTagDuration: 2,
        tagLabelCount: 8,
        enabledTags: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        hotkeys: [
          { type: 'keyboard', label: 'a', tagLabel: 'A', key: 'a', ctrlKey: false },
          { type: 'keyboard', label: 'g', tagLabel: 'G', key: 'g', ctrlKey: false },
          { type: 'keyboard', label: 'h', tagLabel: 'H', key: 'h', ctrlKey: false }
        ]
      };
      localStorage.setItem('sportsDashcam_settings', JSON.stringify(settings));
      location.reload();
    });

    await page.waitForLoadState('load');
    await page.locator('#settingsBtn').click();

    // Change tag count to 4 in General Settings
    await page.locator('#generalSettingsTab').click();
    await page.locator('#tagLabelCount').fill('4');

    // Switch to Hotkeys tab
    await page.locator('#hotkeySettingsTab').click();

    // Tag selector should show only 4 badges
    const tagSelectorBadges = page.locator('#tagSelector .tag-selector-badge');
    await expect(tagSelectorBadges).toHaveCount(4);

    // Tag A should be enabled (within count)
    const hotkeyItemA = page.locator('.hotkey-item').filter({ hasText: /^a$/ });
    await expect(hotkeyItemA.locator('.disabled-badge')).not.toBeVisible();

    // Tags G and H should show DISABLED badge (beyond count)
    // Find items by their tag badge content
    const hotkeyItems = page.locator('.hotkey-item');
    const itemCount = await hotkeyItems.count();

    let foundG = false;
    let foundH = false;

    for (let i = 0; i < itemCount; i++) {
      const item = hotkeyItems.nth(i);
      const tagBadgeText = await item.locator('.tag-badge').textContent();

      if (tagBadgeText === 'G') {
        foundG = true;
        await expect(item.locator('.disabled-badge')).toBeVisible();
        await expect(item.locator('.disabled-badge')).toHaveText('DISABLED');
      }

      if (tagBadgeText === 'H') {
        foundH = true;
        await expect(item.locator('.disabled-badge')).toBeVisible();
        await expect(item.locator('.disabled-badge')).toHaveText('DISABLED');
      }
    }

    expect(foundG).toBe(true);
    expect(foundH).toBe(true);
  });
});
