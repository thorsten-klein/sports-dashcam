const { test, expect } = require('./test-config');

test.describe('Tag Category Colors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for app to be fully initialized
    await page.waitForFunction(() => window.videoTaggerApp && window.videoTaggerApp.ready);
    await page.evaluate(() => window.videoTaggerApp.ready);
  });

  test('should have different colors for each tag button', async ({ page }) => {
    // Set tag label count to 10
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('10');
    await page.locator('#saveSettings').click();

    // Wait for settings dialog to close
    await page.locator('#settingsDialog.active').waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);

    // Add a camera and start recording
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera card to appear before accessing it
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    await page.locator('#startRecordingBtn').click();

    // Check that each button has a different background color
    const colors = await page.evaluate(() => {
      const buttons = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      return buttons.map(label => {
        const button = document.getElementById(`tagButton${label}`);
        return window.getComputedStyle(button).backgroundColor;
      });
    });

    // All colors should be unique
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(10);
  });

  test('should have different colors for each filter', async ({ page }) => {
    await page.locator('#tagsTab').click();

    const colors = await page.evaluate(() => {
      const filters = document.querySelectorAll('.tag-filter');
      return Array.from(filters).map(filter => {
        const indicator = filter.querySelector('.filter-indicator');
        return window.getComputedStyle(indicator).backgroundColor;
      });
    });

    // All colors should be unique
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(10);
  });

  test('should match button and filter colors', async ({ page }) => {
    // Set tag label count to 10
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('10');
    await page.locator('#saveSettings').click();

    // Wait for settings dialog to close
    await page.locator('#settingsDialog.active').waitFor({ state: 'detached', timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(200);

    // Add a camera and start recording
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera card to appear before accessing it
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    await page.locator('#startRecordingBtn').click();

    // Get button colors
    const buttonColors = await page.evaluate(() => {
      const buttons = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      return buttons.map(label => {
        const button = document.getElementById(`tagButton${label}`);
        return window.getComputedStyle(button).backgroundColor;
      });
    });

    // Switch to tags tab and get filter colors
    await page.locator('#tagsTab').click();

    const filterColors = await page.evaluate(() => {
      const filters = document.querySelectorAll('.tag-filter');
      return Array.from(filters).map(filter => {
        const indicator = filter.querySelector('.filter-indicator');
        return window.getComputedStyle(indicator).backgroundColor;
      });
    });

    // Button and filter colors should match for each category
    for (let i = 0; i < 10; i++) {
      expect(buttonColors[i]).toBe(filterColors[i]);
    }
  });
});

test.describe('Tag Category Indicators', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for app to be fully initialized
    await page.waitForFunction(() => window.videoTaggerApp && window.videoTaggerApp.ready);
    await page.evaluate(() => window.videoTaggerApp.ready);
  });

  test('should show category indicator with correct letter', async ({ page }) => {
    // Add camera and start recording
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera card to appear before accessing it
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    await page.locator('#startRecordingBtn').click();
    await page.waitForTimeout(500);

    // Create a tag with category A
    await page.locator('#tagButtonA').click();
    await page.waitForTimeout(300);

    // Go to tags tab
    await page.locator('#tagsTab').click();

    // Should have category indicator with "A"
    const categoryIndicator = page.locator('.tag-item .tag-category-indicator').first();
    await expect(categoryIndicator).toBeVisible();
    await expect(categoryIndicator).toContainText('A');
  });

  test('should show category indicator with color', async ({ page }) => {
    // Add camera and start recording
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera card to appear before accessing it
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    await page.locator('#startRecordingBtn').click();
    await page.waitForTimeout(500);

    // Create a tag with category A
    await page.locator('#tagButtonA').click();
    await page.waitForTimeout(300);

    // Go to tags tab
    await page.locator('#tagsTab').click();

    // Get the background color of the category indicator
    const indicatorColor = await page.evaluate(() => {
      const indicator = document.querySelector('.tag-item .tag-category-indicator');
      const bgColor = window.getComputedStyle(indicator).backgroundColor;
      // Parse RGB to check it's in the red range (for category A)
      const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return {
          r: parseInt(match[1]),
          g: parseInt(match[2]),
          b: parseInt(match[3])
        };
      }
      return null;
    });

    // Category A should be red-ish (high red, low green/blue)
    expect(indicatorColor.r).toBeGreaterThan(200);
    expect(indicatorColor.g).toBeLessThan(100);
    expect(indicatorColor.b).toBeLessThan(100);
  });

  test('should not show tag-badge anymore', async ({ page }) => {
    // Add camera and start recording
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera card to appear before accessing it
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    await page.locator('#startRecordingBtn').click();
    await page.waitForTimeout(500);

    // Create a tag
    await page.locator('#tagButtonA').click();
    await page.waitForTimeout(300);

    // Go to tags tab
    await page.locator('#tagsTab').click();

    // tag-badge should not exist in tag items
    const tagBadge = page.locator('.tag-item .tag-badge');
    await expect(tagBadge).toHaveCount(0);
  });
});

test.describe('Filter and Settings Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for app to be fully initialized
    await page.waitForFunction(() => window.videoTaggerApp && window.videoTaggerApp.ready);
    await page.evaluate(() => window.videoTaggerApp.ready);
  });

  test('should sync filter visibility with tag label count setting', async ({ page }) => {
    // Initially should show 4 filters (default)
    await page.locator('#tagsTab').click();

    const initialVisibleFilters = await page.evaluate(() => {
      const filters = Array.from(document.querySelectorAll('.tag-filter'));
      return filters.filter(f => f.style.display !== 'none').length;
    });
    expect(initialVisibleFilters).toBe(4);

    // Change setting to 7
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('7');
    await page.locator('#saveSettings').click();

    // Go back to tags tab
    await page.locator('#tagsTab').click();

    // Should now show 7 filters
    const newVisibleFilters = await page.evaluate(() => {
      const filters = Array.from(document.querySelectorAll('.tag-filter'));
      return filters.filter(f => f.style.display !== 'none').length;
    });
    expect(newVisibleFilters).toBe(7);
  });

  test('should hide date separators when all tags are filtered out', async ({ page }) => {
    // Add camera and create a tag with category A
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera card to appear before accessing it
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    await page.locator('#startRecordingBtn').click();
    await page.waitForTimeout(500);
    await page.locator('#tagButtonA').click();
    await page.waitForTimeout(300);

    // Go to tags tab
    await page.locator('#tagsTab').click();

    // Date separator should be visible
    const dateSeparatorBefore = page.locator('.date-separator').first();
    await expect(dateSeparatorBefore).toBeVisible();

    // Disable category A filter
    await page.locator('.tag-filter[data-category="A"]').click();
    await page.waitForTimeout(100);

    // Date separator should now be hidden
    const isHidden = await page.evaluate(() => {
      const separator = document.querySelector('.date-separator');
      return separator && separator.style.display === 'none';
    });
    expect(isHidden).toBe(true);
  });

  test('should filter multiple categories independently', async ({ page }) => {
    // Set tag label count to 5
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('5');
    await page.locator('#saveSettings').click();

    // Go to tags tab
    await page.locator('#tagsTab').click();

    // Wait for filters to be updated
    await page.waitForTimeout(200);

    // All 5 visible filters should be active initially
    const initialActiveCount = await page.evaluate(() => {
      const filters = Array.from(document.querySelectorAll('.tag-filter'));
      const visibleFilters = filters.filter(f => f.style.display !== 'none');
      return visibleFilters.filter(f => f.classList.contains('active')).length;
    });
    expect(initialActiveCount).toBe(5);

    // Disable A and C
    await page.locator('.tag-filter[data-category="A"]').click();
    await page.locator('.tag-filter[data-category="C"]').click();
    await page.waitForTimeout(100);

    // Should have 3 active filters now among visible ones
    const activeCount = await page.evaluate(() => {
      const filters = Array.from(document.querySelectorAll('.tag-filter'));
      const visibleFilters = filters.filter(f => f.style.display !== 'none');
      return visibleFilters.filter(f => f.classList.contains('active')).length;
    });
    expect(activeCount).toBe(3);

    // Check which ones are active among visible filters
    const activeCategories = await page.evaluate(() => {
      const filters = Array.from(document.querySelectorAll('.tag-filter'));
      const visibleFilters = filters.filter(f => f.style.display !== 'none');
      return visibleFilters.filter(f => f.classList.contains('active')).map(f => f.dataset.category);
    });
    expect(activeCategories).toEqual(['B', 'D', 'E']);
  });
});

test.describe('Tag Label Count Limits', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for app to be fully initialized
    await page.waitForFunction(() => window.videoTaggerApp && window.videoTaggerApp.ready);
    await page.evaluate(() => window.videoTaggerApp.ready);
  });

  test('should allow setting tag label count to 10', async ({ page }) => {
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('10');
    await page.locator('#saveSettings').click();

    // Verify it was saved
    const settings = await page.evaluate(() => {
      const data = localStorage.getItem('videoTagger_settings');
      return data ? JSON.parse(data) : null;
    });

    expect(settings.tagLabelCount).toBe(10);
  });

  test('should show all 10 buttons when set to 10', async ({ page }) => {
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('10');
    await page.locator('#saveSettings').click();

    // Add camera and start recording
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera card to appear before accessing it
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    await page.locator('#startRecordingBtn').click();

    // Count visible buttons
    const visibleButtons = await page.evaluate(() => {
      const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
      return labels.filter(label => {
        const button = document.getElementById(`tagButton${label}`);
        return button && !button.classList.contains('hidden');
      }).length;
    });

    expect(visibleButtons).toBe(10);
  });

  test('should hide buttons E-J when set to 4', async ({ page }) => {
    // Default is 4, but let's set it explicitly
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('4');
    await page.locator('#saveSettings').click();

    // Add camera and start recording
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera card to appear before accessing it
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    await page.locator('#startRecordingBtn').click();

    // Check visibility
    await expect(page.locator('#tagButtonA')).toBeVisible();
    await expect(page.locator('#tagButtonB')).toBeVisible();
    await expect(page.locator('#tagButtonC')).toBeVisible();
    await expect(page.locator('#tagButtonD')).toBeVisible();
    await expect(page.locator('#tagButtonE')).toHaveClass(/hidden/);
    await expect(page.locator('#tagButtonF')).toHaveClass(/hidden/);
    await expect(page.locator('#tagButtonG')).toHaveClass(/hidden/);
    await expect(page.locator('#tagButtonH')).toHaveClass(/hidden/);
    await expect(page.locator('#tagButtonI')).toHaveClass(/hidden/);
    await expect(page.locator('#tagButtonJ')).toHaveClass(/hidden/);
  });
});
