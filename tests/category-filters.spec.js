const { test, expect } = require('./test-config');

test.describe('Tag Category Filters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for app to be fully initialized
    await page.waitForFunction(() => window.videoTaggerApp && window.videoTaggerApp.ready);
    await page.evaluate(() => window.videoTaggerApp.ready);
  });

  test('should show category filters in Video Tags tab', async ({ page }) => {
    await page.locator('#tagsTab').click();

    // Should have tag filters
    const tagFilters = page.locator('.tag-filter');
    await expect(tagFilters).toHaveCount(10);
  });

  test('should show only configured number of category filters', async ({ page }) => {
    // Set tag label count to 5
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('5');
    await page.locator('#saveSettings').click();

    // Open Video Tags tab
    await page.locator('#tagsTab').click();

    // Only 5 filters should be visible
    const visibleFilters = page.locator('.tag-filter:visible');
    await expect(visibleFilters).toHaveCount(5);
  });

  test('should have all filters enabled by default', async ({ page }) => {
    await page.locator('#tagsTab').click();

    const activeFilters = page.locator('.tag-filter.active');
    await expect(activeFilters).toHaveCount(10);
  });

  test('should toggle filter when clicked', async ({ page }) => {
    await page.locator('#tagsTab').click();

    const filterA = page.locator('.tag-filter[data-category="A"]');
    await expect(filterA).toHaveClass(/active/);

    // Click to disable
    await filterA.click();
    await expect(filterA).not.toHaveClass(/active/);

    // Click to enable again
    await filterA.click();
    await expect(filterA).toHaveClass(/active/);
  });

  test('should filter tags based on enabled categories', async ({ page }) => {
    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Start recording
    await expect(page.locator('#startRecordingBtn')).not.toBeDisabled({ timeout: 5000 });
    await page.locator('#startRecordingBtn').click();
    await page.waitForTimeout(500);

    // Create a tag with label A
    await page.locator('#tagButtonA').click();
    await page.waitForTimeout(300);

    // Go to tags tab
    await page.locator('#tagsTab').click();
    await page.waitForTimeout(200);

    // Tag with category A should be visible
    const tagWithCategoryA = page.locator('.tag-item[data-category="A"]');
    await expect(tagWithCategoryA).toBeVisible();

    // Disable category A filter
    await page.locator('.tag-filter[data-category="A"]').click();
    await page.waitForTimeout(100);

    // Tag with category A should now be hidden
    const isHidden = await page.evaluate(() => {
      const tag = document.querySelector('.tag-item[data-category="A"]');
      return tag && tag.style.display === 'none';
    });
    expect(isHidden).toBe(true);

    // Re-enable category A filter
    await page.locator('.tag-filter[data-category="A"]').click();
    await page.waitForTimeout(100);

    // Tag should be visible again
    const isVisible = await page.evaluate(() => {
      const tag = document.querySelector('.tag-item[data-category="A"]');
      return tag && tag.style.display !== 'none';
    });
    expect(isVisible).toBe(true);
  });

  test('should show category indicator on tag items', async ({ page }) => {
    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Start recording and create a tag
    await expect(page.locator('#startRecordingBtn')).not.toBeDisabled({ timeout: 5000 });
    await page.locator('#startRecordingBtn').click();
    await page.waitForTimeout(500);
    await page.locator('#tagButtonA').click();

    // Go to tags tab
    await page.locator('#tagsTab').click();

    // Should have category indicator
    const categoryIndicator = page.locator('.tag-category-indicator').first();
    await expect(categoryIndicator).toBeVisible();
    await expect(categoryIndicator).toContainText('A');
  });
});

test.describe('Tag Button Colors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should show up to 10 tag buttons', async ({ page }) => {
    // Set tag label count to 10
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('10');
    await page.locator('#saveSettings').click();

    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();

    // Start recording
    await expect(page.locator('#startRecordingBtn')).not.toBeDisabled({ timeout: 5000 });
    await page.locator('#startRecordingBtn').click();

    // All 10 tag buttons should be visible
    await expect(page.locator('#tagButtonA')).toBeVisible();
    await expect(page.locator('#tagButtonB')).toBeVisible();
    await expect(page.locator('#tagButtonC')).toBeVisible();
    await expect(page.locator('#tagButtonD')).toBeVisible();
    await expect(page.locator('#tagButtonE')).toBeVisible();
    await expect(page.locator('#tagButtonF')).toBeVisible();
    await expect(page.locator('#tagButtonG')).toBeVisible();
    await expect(page.locator('#tagButtonH')).toBeVisible();
    await expect(page.locator('#tagButtonI')).toBeVisible();
    await expect(page.locator('#tagButtonJ')).toBeVisible();
  });

  test('should have correct labels on all tag buttons', async ({ page }) => {
    // Set tag label count to 10
    await page.locator('#settingsBtn').click();
    await page.locator('#tagLabelCount').fill('10');
    await page.locator('#saveSettings').click();

    // Add a camera and start recording
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    await expect(page.locator('#startRecordingBtn')).not.toBeDisabled({ timeout: 5000 });
    await page.locator('#startRecordingBtn').click();

    // Check all button labels
    await expect(page.locator('#tagButtonA')).toContainText('Tag A');
    await expect(page.locator('#tagButtonB')).toContainText('Tag B');
    await expect(page.locator('#tagButtonC')).toContainText('Tag C');
    await expect(page.locator('#tagButtonD')).toContainText('Tag D');
    await expect(page.locator('#tagButtonE')).toContainText('Tag E');
    await expect(page.locator('#tagButtonF')).toContainText('Tag F');
    await expect(page.locator('#tagButtonG')).toContainText('Tag G');
    await expect(page.locator('#tagButtonH')).toContainText('Tag H');
    await expect(page.locator('#tagButtonI')).toContainText('Tag I');
    await expect(page.locator('#tagButtonJ')).toContainText('Tag J');
  });
});
