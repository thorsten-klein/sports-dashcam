const { test, expect } = require('./test-config');

test.describe('Sports-Dashcam App - Basic UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load the application', async ({ page }) => {
    await expect(page).toHaveTitle('Sports-Dashcam');
    await expect(page.locator('.app-title')).toContainText('Sports-Dashcam');
  });

  test('should show empty state when no cameras added', async ({ page }) => {
    const emptyState = page.locator('#emptyState');
    await expect(emptyState).toBeVisible();
    await expect(emptyState).toContainText('No Cameras Added');
    await expect(emptyState).toContainText('Add your first IP camera to start monitoring');
  });

  test('should have main navigation tabs', async ({ page }) => {
    await expect(page.locator('#camerasTab')).toBeVisible();
    await expect(page.locator('#tagsTab')).toBeVisible();
    await expect(page.locator('#fullVideosTab')).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    // Cameras tab is active by default
    await expect(page.locator('#camerasTab')).toHaveClass(/active/);
    await expect(page.locator('#camerasTabContent')).not.toHaveClass(/hidden/);

    // Switch to Tags tab
    await page.locator('#tagsTab').click();
    await expect(page.locator('#tagsTab')).toHaveClass(/active/);
    await expect(page.locator('#tagsTabContent')).not.toHaveClass(/hidden/);
    await expect(page.locator('#camerasTabContent')).toHaveClass(/hidden/);

    // Switch to Full Videos tab
    await page.locator('#fullVideosTab').click();
    await expect(page.locator('#fullVideosTab')).toHaveClass(/active/);
    await expect(page.locator('#fullVideosTabContent')).not.toHaveClass(/hidden/);
    await expect(page.locator('#tagsTabContent')).toHaveClass(/hidden/);
  });

  test('should have header action buttons', async ({ page }) => {
    await expect(page.locator('#startRecordingBtn')).toBeVisible();
    await expect(page.locator('#lockScreenBtn')).toBeVisible();
    await expect(page.locator('#fullscreenBtn')).toBeVisible();
    await expect(page.locator('#settingsBtn')).toBeVisible();
  });

  test('should show tags empty state', async ({ page }) => {
    await page.locator('#tagsTab').click();
    await expect(page.locator('#tagsEmpty')).toBeVisible();
    await expect(page.locator('#tagsEmpty')).toContainText('No saved clips yet');
  });

  test('should show full videos empty state', async ({ page }) => {
    await page.locator('#fullVideosTab').click();
    await expect(page.locator('#fullVideosEmpty')).toBeVisible();
    await expect(page.locator('#fullVideosEmpty')).toContainText('No full videos yet');
  });
});
