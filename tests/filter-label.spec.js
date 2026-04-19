const { test, expect } = require('@playwright/test');

test.describe('Filter Label', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display "Filter:" label before tag filters', async ({ page }) => {
    // Switch to tags tab to see the filters
    await page.locator('#tagsTab').click();

    // Check if the filter label exists
    const filterLabel = page.locator('.filter-label-text');
    await expect(filterLabel).toBeVisible();
    await expect(filterLabel).toContainText('Filter:');
  });

  test('filter label should have correct styling', async ({ page }) => {
    await page.locator('#tagsTab').click();

    const filterLabel = page.locator('.filter-label-text');

    const fontSize = await filterLabel.evaluate(el => window.getComputedStyle(el).fontSize);
    const fontWeight = await filterLabel.evaluate(el => window.getComputedStyle(el).fontWeight);

    expect(fontSize).toBe('14px');
    expect(fontWeight).toBe('500');
  });
});
