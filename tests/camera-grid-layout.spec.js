const { test, expect } = require('@playwright/test');

test.describe('Camera Grid Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage before each test
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for app to be fully initialized
    await page.waitForFunction(() => window.videoTaggerApp && window.videoTaggerApp.ready);
    await page.evaluate(() => window.videoTaggerApp.ready);
  });

  const addCamera = async (page, name, url) => {
    // Click add camera button (either first camera or card)
    const addFirstBtn = page.locator('#addFirstCamera');
    const addCameraCard = page.locator('#addCameraCard');

    if (await addFirstBtn.isVisible()) {
      await addFirstBtn.click();
    } else {
      await addCameraCard.click();
    }

    // Wait for dialog to be visible and active
    await expect(page.locator('#addCameraDialog.active')).toBeVisible();

    // Fill in camera details
    await page.locator('#cameraName').click();
    await page.locator('#cameraName').fill(name);
    await page.locator('#cameraUrl').click();
    await page.locator('#cameraUrl').fill(url);

    // Get current camera count before adding
    const currentCameras = page.locator('.camera-card[id^="camera-"]');
    const beforeCount = await currentCameras.count();

    // Submit
    await page.locator('#confirmAddCamera').click();

    // Wait for new camera to appear (this confirms the camera was added successfully)
    await currentCameras.nth(beforeCount).waitFor({ state: 'visible', timeout: 5000 });

    // Wait for dialog to close (dialog loses 'active' class but stays in DOM)
    await expect(page.locator('#addCameraDialog.active')).not.toBeVisible({ timeout: 2000 });

    // Give a moment for rendering
    await page.waitForTimeout(200);
  };

  test('should center single camera', async ({ page }) => {
    // Add one camera
    await addCamera(page, 'Camera 1', 'http://localhost:8900/stream');

    // Wait for camera to appear
    const cameraGrid = page.locator('#cameraGrid');
    await expect(cameraGrid).toBeVisible();

    // Get camera cards (excluding add camera card by checking for video element)
    const cameras = page.locator('.camera-card[id^="camera-"]');
    await expect(cameras).toHaveCount(1);

    // Get grid and all flex items (camera + add-camera-card)
    const gridBox = await cameraGrid.boundingBox();
    const cameraBox = await cameras.first().boundingBox();
    const addCameraCard = page.locator('#addCameraCard');
    const addCameraBox = await addCameraCard.boundingBox();

    // Check that items are centered as a group (flexbox centers all items together)
    // Calculate the group bounds (leftmost to rightmost item)
    const groupLeft = Math.min(cameraBox.x, addCameraBox.x);
    const groupRight = Math.max(cameraBox.x + cameraBox.width, addCameraBox.x + addCameraBox.width);
    const groupCenter = (groupLeft + groupRight) / 2;
    const gridCenter = gridBox.x + gridBox.width / 2;

    // The group should be centered (within 60px tolerance for padding/margins)
    expect(Math.abs(gridCenter - groupCenter)).toBeLessThan(60);
  });

  test('should center two cameras side by side', async ({ page }) => {
    // Add two cameras
    await addCamera(page, 'Camera 1', 'http://localhost:8900/stream');
    await addCamera(page, 'Camera 2', 'http://localhost:8900/stream');

    // Wait for cameras to appear
    const cameraGrid = page.locator('#cameraGrid');
    await expect(cameraGrid).toBeVisible();

    // Get camera cards (excluding add camera card by checking for video element)
    const cameras = page.locator('.camera-card[id^="camera-"]');
    await expect(cameras).toHaveCount(2);

    // Get positions
    const gridBox = await cameraGrid.boundingBox();
    const camera1Box = await cameras.nth(0).boundingBox();
    const camera2Box = await cameras.nth(1).boundingBox();
    const addCameraCard = page.locator('#addCameraCard');
    const addCameraBox = await addCameraCard.boundingBox();

    // Cameras should be on the same row (same y position, within tolerance)
    expect(Math.abs(camera1Box.y - camera2Box.y)).toBeLessThan(5);

    // Check if all items are centered as a group (cameras + add-camera-card)
    const groupLeft = Math.min(camera1Box.x, camera2Box.x, addCameraBox.x);
    const groupRight = Math.max(
      camera1Box.x + camera1Box.width,
      camera2Box.x + camera2Box.width,
      addCameraBox.x + addCameraBox.width
    );
    const groupCenter = (groupLeft + groupRight) / 2;
    const gridCenter = gridBox.x + gridBox.width / 2;

    // The group should be centered (within 60px tolerance to account for padding/margins)
    expect(Math.abs(gridCenter - groupCenter)).toBeLessThan(60);
  });

  test('should wrap and center three cameras', async ({ page }) => {
    // Ensure viewport is wide enough for 2 cameras but not 3
    await page.setViewportSize({ width: 900, height: 800 });

    // Add three cameras
    await addCamera(page, 'Camera 1', 'http://localhost:8900/stream');
    await addCamera(page, 'Camera 2', 'http://localhost:8900/stream');
    await addCamera(page, 'Camera 3', 'http://localhost:8900/stream');

    // Wait for cameras to appear and layout to stabilize
    const cameraGrid = page.locator('#cameraGrid');
    await expect(cameraGrid).toBeVisible();
    await page.waitForTimeout(300);

    // Get camera cards (excluding add camera card by checking for video element)
    const cameras = page.locator('.camera-card[id^="camera-"]');
    await expect(cameras).toHaveCount(3);

    // Get grid position
    const gridBox = await cameraGrid.boundingBox();
    const gridCenter = gridBox.x + gridBox.width / 2;

    // Get all item positions (cameras + add-camera-card)
    const camera1Box = await cameras.nth(0).boundingBox();
    const camera2Box = await cameras.nth(1).boundingBox();
    const camera3Box = await cameras.nth(2).boundingBox();
    const addCameraCard = page.locator('#addCameraCard');
    const addCameraBox = await addCameraCard.boundingBox();

    // Group all items by row based on y position
    const allItems = [
      { box: camera1Box, name: 'camera1' },
      { box: camera2Box, name: 'camera2' },
      { box: camera3Box, name: 'camera3' },
      { box: addCameraBox, name: 'addCamera' }
    ];

    const rows = [];
    allItems.forEach(item => {
      let foundRow = false;
      for (const row of rows) {
        if (Math.abs(item.box.y - row[0].box.y) < 5) {
          row.push(item);
          foundRow = true;
          break;
        }
      }
      if (!foundRow) {
        rows.push([item]);
      }
    });

    // Should have items wrapped to multiple rows
    expect(rows.length).toBeGreaterThan(1);

    // Check centering of each row (flexbox centers items on each row)
    for (const row of rows) {
      const rowLeft = Math.min(...row.map(item => item.box.x));
      const rowRight = Math.max(...row.map(item => item.box.x + item.box.width));
      const rowCenter = (rowLeft + rowRight) / 2;

      // Each row should be centered (within 60px tolerance to account for padding/margins)
      expect(Math.abs(gridCenter - rowCenter)).toBeLessThan(60);
    }
  });

  test('should maintain center alignment with different viewport sizes', async ({ page }) => {
    // Test with desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });

    await addCamera(page, 'Camera 1', 'http://localhost:8900/stream');

    const cameraGrid = page.locator('#cameraGrid');
    const cameras = page.locator('.camera-card[id^="camera-"]');
    const addCameraCard = page.locator('#addCameraCard');

    let gridBox = await cameraGrid.boundingBox();
    let cameraBox = await cameras.first().boundingBox();
    let addCameraBox = await addCameraCard.boundingBox();
    let gridCenter = gridBox.x + gridBox.width / 2;

    // Calculate group center (camera + add-camera-card)
    let groupLeft = Math.min(cameraBox.x, addCameraBox.x);
    let groupRight = Math.max(cameraBox.x + cameraBox.width, addCameraBox.x + addCameraBox.width);
    let groupCenter = (groupLeft + groupRight) / 2;

    // Should be centered on desktop (within 60px tolerance)
    expect(Math.abs(gridCenter - groupCenter)).toBeLessThan(60);

    // Test with tablet viewport
    await page.setViewportSize({ width: 768, height: 800 });
    await page.waitForTimeout(100); // Wait for layout to update

    gridBox = await cameraGrid.boundingBox();
    cameraBox = await cameras.first().boundingBox();
    addCameraBox = await addCameraCard.boundingBox();
    gridCenter = gridBox.x + gridBox.width / 2;

    // Recalculate group center
    groupLeft = Math.min(cameraBox.x, addCameraBox.x);
    groupRight = Math.max(cameraBox.x + cameraBox.width, addCameraBox.x + addCameraBox.width);
    groupCenter = (groupLeft + groupRight) / 2;

    // Should still be centered on tablet (within 60px tolerance)
    expect(Math.abs(gridCenter - groupCenter)).toBeLessThan(60);
  });

  test('should use flexbox with justify-content center', async ({ page }) => {
    await addCamera(page, 'Camera 1', 'http://localhost:8900/stream');

    // Check CSS properties
    const cameraGrid = page.locator('#cameraGrid');
    const display = await cameraGrid.evaluate(el => window.getComputedStyle(el).display);
    const justifyContent = await cameraGrid.evaluate(el => window.getComputedStyle(el).justifyContent);
    const flexWrap = await cameraGrid.evaluate(el => window.getComputedStyle(el).flexWrap);

    expect(display).toBe('flex');
    expect(justifyContent).toBe('center');
    expect(flexWrap).toBe('wrap');
  });

  test('should have fixed width cameras', async ({ page }) => {
    await addCamera(page, 'Camera 1', 'http://localhost:8900/stream');

    const cameras = page.locator('.camera-card[id^="camera-"]');
    const cameraBox = await cameras.first().boundingBox();

    // Camera should be 400px wide (on desktop)
    expect(cameraBox.width).toBe(400);
  });
});
