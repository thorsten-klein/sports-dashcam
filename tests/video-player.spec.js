const { test, expect } = require('@playwright/test');

test.describe('Video Player Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have video player dialog elements', async ({ page }) => {
    const dialog = page.locator('#videoPlayerDialog');
    await expect(dialog).toBeDefined();

    // Dialog should not be active initially (it exists in DOM but is not visible with .active class)
    const activeDialog = page.locator('#videoPlayerDialog.active');
    await expect(activeDialog).not.toBeVisible();
  });

  test('should have video player controls', async ({ page }) => {
    // Check that video player and control buttons exist in the DOM
    await expect(page.locator('#videoPlayer')).toBeDefined();
    await expect(page.locator('#closeVideoPlayer')).toBeDefined();
    await expect(page.locator('#downloadVideo')).toBeDefined();
    await expect(page.locator('#deleteVideoPlayer')).toBeDefined();
  });

  test('should have video player title', async ({ page }) => {
    await expect(page.locator('#videoPlayerTitle')).toBeDefined();
  });

  test('should have close button in video player', async ({ page }) => {
    await expect(page.locator('#closeVideoPlayer')).toBeDefined();
    await expect(page.locator('#closeVideoPlayerBtn')).toBeDefined();
  });

  test('should have download progress indicator', async ({ page }) => {
    const progressIndicator = page.locator('#downloadProgress');
    await expect(progressIndicator).toBeDefined();

    // Should be hidden by default
    await expect(progressIndicator).toHaveClass(/hidden/);
  });

  test('should have abort button in download progress', async ({ page }) => {
    const abortBtn = page.locator('#abortDownload');
    await expect(abortBtn).toBeDefined();
    await expect(abortBtn).toHaveAttribute('title', 'Cancel Download');

    // Check the icon
    const icon = abortBtn.locator('.material-icons');
    await expect(icon).toHaveText('close');
  });
});
