const { test, expect } = require('./test-config');

test.describe('Tag Filters Scrolling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test('should have smaller tag filters', async ({ page }) => {
    await page.locator('#tagsTab').click();

    // Check filter size (padding and font-size)
    const filterStyle = await page.evaluate(() => {
      const filter = document.querySelector('.tag-filter');
      const styles = window.getComputedStyle(filter);
      return {
        fontSize: styles.fontSize,
        padding: styles.padding
      };
    });

    // Font size should be 12px (smaller than before which was 14px)
    expect(filterStyle.fontSize).toBe('12px');
  });

  test('should have no padding above tag-filters', async ({ page }) => {
    await page.locator('#tagsTab').click();

    const paddingTop = await page.evaluate(() => {
      const filters = document.querySelector('.tag-filters');
      const styles = window.getComputedStyle(filters);
      return styles.paddingTop;
    });

    // Should have no top padding
    expect(paddingTop).toBe('0px');
  });

  test('should not scroll tag-filters when tags-list scrolls', async ({ page }) => {
    // Add a camera and create many tags
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    // Start recording and create multiple tags
    await page.locator('#startRecordingBtn').click();
    await page.waitForTimeout(500);

    for (let i = 0; i < 20; i++) {
      await page.locator('#tagButtonA').click();
      await page.waitForTimeout(50);
    }

    // Go to tags tab
    await page.locator('#tagsTab').click();
    await page.waitForTimeout(200);

    // Get initial position of tag-filters
    const initialPosition = await page.evaluate(() => {
      const filters = document.querySelector('.tag-filters');
      return filters.getBoundingClientRect().top;
    });

    // Scroll the tags-list container
    await page.evaluate(() => {
      const scrollContainer = document.querySelector('.tags-content-scrollable');
      scrollContainer.scrollTop = 500;
    });

    await page.waitForTimeout(100);

    // Get new position of tag-filters
    const newPosition = await page.evaluate(() => {
      const filters = document.querySelector('.tag-filters');
      return filters.getBoundingClientRect().top;
    });

    // Position should not change when scrolling
    expect(newPosition).toBe(initialPosition);
  });

  test('should have tags-content-scrollable with overflow', async ({ page }) => {
    await page.locator('#tagsTab').click();

    const hasOverflow = await page.evaluate(() => {
      const scrollContainer = document.querySelector('.tags-content-scrollable');
      const styles = window.getComputedStyle(scrollContainer);
      return styles.overflowY === 'auto';
    });

    expect(hasOverflow).toBe(true);
  });

  test('should have smaller filter indicator', async ({ page }) => {
    await page.locator('#tagsTab').click();

    const indicatorSize = await page.evaluate(() => {
      const indicator = document.querySelector('.filter-indicator');
      const styles = window.getComputedStyle(indicator);
      return {
        width: styles.width,
        height: styles.height
      };
    });

    // Should be 12px (was 16px before)
    expect(indicatorSize.width).toBe('12px');
    expect(indicatorSize.height).toBe('12px');
  });

  test('should keep tag-filters visible while scrolling tags', async ({ page }) => {
    // Add a camera and create many tags
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    await page.locator('#startRecordingBtn').click();
    await page.waitForTimeout(500);

    // Create multiple tags
    for (let i = 0; i < 15; i++) {
      await page.locator('#tagButtonA').click();
      await page.waitForTimeout(50);
    }

    await page.locator('#tagsTab').click();
    await page.waitForTimeout(200);

    // Scroll to bottom
    await page.evaluate(() => {
      const scrollContainer = document.querySelector('.tags-content-scrollable');
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    });

    await page.waitForTimeout(100);

    // Tag filters should still be visible
    const filtersVisible = await page.locator('.tag-filters').isVisible();
    expect(filtersVisible).toBe(true);
  });
});
