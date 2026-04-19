const { test, expect } = require('@playwright/test');

test.describe('Full Videos Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for app to be fully initialized
    await page.waitForFunction(() => window.videoTaggerApp && window.videoTaggerApp.ready);
    await page.evaluate(() => window.videoTaggerApp.ready);
  });

  test('should have tag-content wrapper in full video items', async ({ page }) => {
    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    // Start recording to create a full video entry
    await page.locator('#startRecordingBtn').click();
    await page.waitForTimeout(500);

    // Go to Full Videos tab
    await page.locator('#fullVideosTab').click();
    await page.waitForTimeout(200);

    // Check that full video item has tag-content wrapper
    const hasTagContent = await page.evaluate(() => {
      const fullVideoItem = document.querySelector('#fullVideosList .tag-item');
      if (!fullVideoItem) return false;
      const tagContent = fullVideoItem.querySelector('.tag-content');
      return tagContent !== null;
    });

    expect(hasTagContent).toBe(true);
  });

  test('should have tag-delete button on the right in full video items', async ({ page }) => {
    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    // Start recording
    await page.locator('#startRecordingBtn').click();
    await page.waitForTimeout(500);

    // Go to Full Videos tab
    await page.locator('#fullVideosTab').click();
    await page.waitForTimeout(200);

    // Check tag-delete is inside tag-header
    const deleteButtonStructure = await page.evaluate(() => {
      const fullVideoItem = document.querySelector('#fullVideosList .tag-item');
      if (!fullVideoItem) return null;

      const tagHeader = fullVideoItem.querySelector('.tag-content .tag-header');
      if (!tagHeader) return null;

      const deleteButton = tagHeader.querySelector('.tag-delete');
      return deleteButton !== null;
    });

    expect(deleteButtonStructure).toBe(true);
  });

  test('should not show tag-badge in full video items', async ({ page }) => {
    // Add a camera
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    // Start recording
    await page.locator('#startRecordingBtn').click();
    await page.waitForTimeout(500);

    // Go to Full Videos tab
    await page.locator('#fullVideosTab').click();
    await page.waitForTimeout(200);

    // tag-badge should not exist in full video items
    const tagBadge = page.locator('#fullVideosList .tag-item .tag-badge');
    await expect(tagBadge).toHaveCount(0);
  });

  test('should match tag items structure (without category indicator)', async ({ page }) => {
    // Add camera and create both a tag and a full video
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill('http://localhost:8900/stream');
    await page.locator('#confirmAddCamera').click();
    await page.locator('.camera-card[id^="camera-"]').waitFor({ state: 'visible', timeout: 5000 });

    await page.locator('#startRecordingBtn').click();
    await page.waitForTimeout(500);

    // Create a tag
    await page.locator('#tagButtonA').click();
    await page.waitForTimeout(300);

    // Compare structures
    const structures = await page.evaluate(() => {
      // Get tag item structure
      const tagItem = document.querySelector('#tagsList .tag-item');
      const tagHasContent = tagItem ? tagItem.querySelector('.tag-content') !== null : false;
      const tagHasHeader = tagItem ? tagItem.querySelector('.tag-content .tag-header') !== null : false;
      const tagHasInfo = tagItem ? tagItem.querySelector('.tag-content .tag-info') !== null : false;

      // Get full video item structure
      const fullVideoItem = document.querySelector('#fullVideosList .tag-item');
      const videoHasContent = fullVideoItem ? fullVideoItem.querySelector('.tag-content') !== null : false;
      const videoHasHeader = fullVideoItem ? fullVideoItem.querySelector('.tag-content .tag-header') !== null : false;
      const videoHasInfo = fullVideoItem ? fullVideoItem.querySelector('.tag-content .tag-info') !== null : false;

      return {
        tag: { hasContent: tagHasContent, hasHeader: tagHasHeader, hasInfo: tagHasInfo },
        video: { hasContent: videoHasContent, hasHeader: videoHasHeader, hasInfo: videoHasInfo }
      };
    });

    // Both should have the same structure (tag-content, tag-header, tag-info)
    expect(structures.tag.hasContent).toBe(true);
    expect(structures.tag.hasHeader).toBe(true);
    expect(structures.tag.hasInfo).toBe(true);
    expect(structures.video.hasContent).toBe(true);
    expect(structures.video.hasHeader).toBe(true);
    expect(structures.video.hasInfo).toBe(true);
  });
});
