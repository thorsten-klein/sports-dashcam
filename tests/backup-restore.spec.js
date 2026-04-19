const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test.describe('Backup and Restore Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForFunction(() => window.videoTaggerApp && window.videoTaggerApp.ready);
  });

  test('should have backup and restore buttons in settings dialog', async ({ page }) => {
    // Open settings dialog
    await page.locator('#settingsBtn').click();

    // Wait for dialog to be visible
    const settingsDialog = page.locator('#settingsDialog');
    await expect(settingsDialog).toHaveClass(/active/);

    // Check for backup button
    const backupBtn = page.locator('#backupSettings');
    await expect(backupBtn).toBeVisible();
    await expect(backupBtn).toHaveAttribute('title', 'Backup Settings');

    // Check for restore button
    const restoreBtn = page.locator('#restoreSettings');
    await expect(restoreBtn).toBeVisible();
    await expect(restoreBtn).toHaveAttribute('title', 'Restore Settings');
  });

  test('should backup settings to JSON file', async ({ page }) => {
    // Add a camera first
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').fill('Test Camera');
    await page.locator('#cameraUrl').fill('http://localhost:9999/stream');
    await page.locator('#confirmAddCamera').click();

    // Wait for camera to be added
    await page.waitForTimeout(500);

    // Open settings and change some values
    await page.locator('#settingsBtn').click();
    await page.locator('#preTagDuration').fill('15');
    await page.locator('#postTagDuration').fill('5');
    await page.locator('#saveSettings').click();

    // Wait for dialog to close
    await page.waitForTimeout(300);

    // Open settings again
    await page.locator('#settingsBtn').click();

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click backup button
    await page.locator('#backupSettings').click();

    // Wait for download
    const download = await downloadPromise;

    // Verify filename pattern
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/^sports-dashcam-backup-\d{8}-\d{4}\.json$/);

    // Save and read the file
    const tempPath = path.join(__dirname, '../test-results', 'backup-test.json');
    await download.saveAs(tempPath);

    // Verify file contents
    const backupData = JSON.parse(fs.readFileSync(tempPath, 'utf-8'));

    expect(backupData).toHaveProperty('version', '1.0');
    expect(backupData).toHaveProperty('timestamp');
    expect(backupData).toHaveProperty('cameras');
    expect(backupData).toHaveProperty('settings');
    expect(backupData).not.toHaveProperty('tags');
    expect(backupData).not.toHaveProperty('fullVideos');

    // Verify camera was backed up
    expect(backupData.cameras).toHaveLength(1);
    expect(backupData.cameras[0].name).toBe('Test Camera');
    expect(backupData.cameras[0].url).toBe('http://localhost:9999/stream');

    // Verify settings were backed up
    expect(backupData.settings.preTagDuration).toBe(15);
    expect(backupData.settings.postTagDuration).toBe(5);

    // Clean up
    fs.unlinkSync(tempPath);
  });

  test('should restore settings from JSON file', async ({ page }) => {
    // Create a backup file
    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      cameras: [
        {
          id: 'camera_test_123',
          name: 'Restored Camera',
          url: 'http://localhost:9999/restored',
          rotation: 90,
          mirrored: true,
          isConnected: true,
          isRecording: false,
          createdAt: new Date().toISOString()
        }
      ],
      settings: {
        preTagDuration: 20,
        postTagDuration: 8,
        tagLabelCount: 6,
        hotkeys: []
      },
      tags: [],
      fullVideos: []
    };

    const tempPath = path.join(__dirname, '../test-results', 'restore-test.json');
    fs.mkdirSync(path.dirname(tempPath), { recursive: true });
    fs.writeFileSync(tempPath, JSON.stringify(backup, null, 2));

    // Open settings dialog
    await page.locator('#settingsBtn').click();

    // Set up file chooser handler
    const fileChooserPromise = page.waitForEvent('filechooser');

    // Click restore button
    await page.locator('#restoreSettings').click();

    // Select the backup file
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(tempPath);

    // Handle confirmation dialog
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('overwrite all settings');
      await dialog.accept();
    });

    // Wait for page reload
    await page.waitForLoadState('load');
    await page.waitForFunction(() => window.videoTaggerApp && window.videoTaggerApp.ready);

    // Verify camera was restored
    const cameraCard = page.locator('.camera-card').first();
    await expect(cameraCard).toBeVisible();
    await expect(cameraCard.locator('.camera-info h3')).toContainText('Restored Camera');

    // Verify settings were restored
    await page.locator('#settingsBtn').click();
    const preTagInput = page.locator('#preTagDuration');
    const postTagInput = page.locator('#postTagDuration');
    const tagLabelInput = page.locator('#tagLabelCount');

    await expect(preTagInput).toHaveValue('20');
    await expect(postTagInput).toHaveValue('8');
    await expect(tagLabelInput).toHaveValue('6');

    // Clean up
    fs.unlinkSync(tempPath);
  });

  test('should show error for invalid backup file', async ({ page }) => {
    // Create an invalid backup file
    const invalidBackup = {
      invalid: 'data'
    };

    const tempPath = path.join(__dirname, '../test-results', 'invalid-backup.json');
    fs.mkdirSync(path.dirname(tempPath), { recursive: true });
    fs.writeFileSync(tempPath, JSON.stringify(invalidBackup));

    // Open settings dialog
    await page.locator('#settingsBtn').click();

    // Set up file chooser handler
    const fileChooserPromise = page.waitForEvent('filechooser');

    // Click restore button
    await page.locator('#restoreSettings').click();

    // Select the invalid file
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(tempPath);

    // Wait for error toast
    await page.waitForTimeout(500);
    const toast = page.locator('#toast');
    await expect(toast).toBeVisible();
    await expect(toast.locator('#toastMessage')).toContainText('Failed to restore');

    // Clean up
    fs.unlinkSync(tempPath);
  });

  test('should cancel restore when user declines confirmation', async ({ page }) => {
    // Create a valid backup file
    const backup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      cameras: [],
      settings: {
        preTagDuration: 99,
        postTagDuration: 99,
        tagLabelCount: 10,
        hotkeys: []
      },
      tags: [],
      fullVideos: []
    };

    const tempPath = path.join(__dirname, '../test-results', 'cancel-restore.json');
    // Ensure directory exists
    const dir = path.dirname(tempPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(tempPath, JSON.stringify(backup));

    // Open settings dialog
    await page.locator('#settingsBtn').click();

    // Set preTag to a known value
    await page.locator('#preTagDuration').fill('10');
    await page.locator('#saveSettings').click();
    await page.waitForTimeout(300);

    // Open settings again
    await page.locator('#settingsBtn').click();

    // Set up file chooser handler
    const fileChooserPromise = page.waitForEvent('filechooser');

    // Click restore button
    await page.locator('#restoreSettings').click();

    // Select the backup file
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(tempPath);

    // Decline confirmation dialog
    page.once('dialog', async dialog => {
      await dialog.dismiss();
    });

    // Wait a bit
    await page.waitForTimeout(500);

    // Verify settings were NOT restored (still 10, not 99)
    const preTagInput = page.locator('#preTagDuration');
    await expect(preTagInput).toHaveValue('10');

    // Clean up
    fs.unlinkSync(tempPath);
  });

  test('should not include tags in backup', async ({ page }) => {
    // Mock the MJPEG stream for tag creation
    const streamUrl = 'http://localhost:9999/test-stream';
    const minimalJpeg = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF,
      0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0xFF, 0xC4, 0x00, 0x14, 0x10, 0x01, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00,
      0x7F, 0xFF, 0xD9
    ]);

    await page.route(streamUrl, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: route.request().resourceType() === 'image' ? 'image/jpeg' : 'multipart/x-mixed-replace; boundary=frame',
        headers: { 'Cache-Control': 'no-cache', 'Access-Control-Allow-Origin': '*' },
        body: minimalJpeg
      });
    });

    // Add camera and start recording
    await page.locator('#addFirstCamera').click();
    await page.locator('#cameraName').fill('Tag Test Camera');
    await page.locator('#cameraUrl').fill(streamUrl);
    await page.locator('#confirmAddCamera').click();
    await page.waitForTimeout(1000);

    // Start recording
    await page.locator('#startRecordingBtn').click();
    await page.waitForTimeout(500);

    // Create a tag
    await page.locator('#tagButtonA').click();
    await page.waitForTimeout(3000); // Wait for clip creation

    // Backup
    await page.locator('#settingsBtn').click();
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#backupSettings').click();
    const download = await downloadPromise;

    const tempPath = path.join(__dirname, '../test-results', 'backup-without-tags.json');
    await download.saveAs(tempPath);

    // Read backup and verify tags are NOT included
    const backupData = JSON.parse(fs.readFileSync(tempPath, 'utf-8'));
    expect(backupData).not.toHaveProperty('tags');

    // Clean up
    fs.unlinkSync(tempPath);
  });
});
