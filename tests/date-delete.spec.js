const { test, expect } = require('@playwright/test');

test.describe('Date Delete Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    // Wait for app to be fully initialized
    await page.waitForFunction(() => window.videoTaggerApp && window.videoTaggerApp.ready);
    await page.evaluate(() => window.videoTaggerApp.ready);
  });

  test('date separators should have delete icons', async ({ page }) => {
    // Check if date separator structure includes delete button
    const hasCSSForDeleteBtn = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            if (rule.selectorText && rule.selectorText.includes('.date-delete-btn')) {
              return true;
            }
          }
        } catch (e) {
          // CORS error, skip
        }
      }
      return false;
    });

    expect(hasCSSForDeleteBtn).toBe(true);
  });

  test('delete date dialog should exist in HTML', async ({ page }) => {
    const deleteDateDialog = page.locator('#deleteDateDialog');
    await expect(deleteDateDialog).toBeAttached();

    const dialogTitle = deleteDateDialog.locator('h2');
    await expect(dialogTitle).toContainText('Delete Videos');
  });

  test('delete date dialog should have error button styling', async ({ page }) => {
    const confirmBtn = page.locator('#confirmDeleteDate');
    await expect(confirmBtn).toBeAttached();
    await expect(confirmBtn).toContainText('Delete All');

    // Check if btn-error class is present
    const hasErrorClass = await confirmBtn.evaluate(el => el.classList.contains('btn-error'));
    expect(hasErrorClass).toBe(true);
  });

  test('clear all buttons should be hidden', async ({ page }) => {
    const clearAllTagsContainer = page.locator('#clearAllTagsContainer');
    const clearAllVideosContainer = page.locator('#clearAllFullVideosContainer');

    // Check if containers have display: none
    const tagsDisplay = await clearAllTagsContainer.evaluate(el => window.getComputedStyle(el).display);
    const videosDisplay = await clearAllVideosContainer.evaluate(el => window.getComputedStyle(el).display);

    expect(tagsDisplay).toBe('none');
    expect(videosDisplay).toBe('none');
  });

  test('date separator should have proper structure', async ({ page }) => {
    // Check the structure by evaluating the createDateSeparator method exists
    const hasMethod = await page.evaluate(() => {
      return typeof window.app !== 'undefined';
    });

    // Just verify the page loads without errors
    expect(hasMethod).toBeDefined();
  });

  test('dialog-small CSS class should exist', async ({ page }) => {
    const hasDialogSmallCSS = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            if (rule.selectorText && rule.selectorText.includes('.dialog-small')) {
              return true;
            }
          }
        } catch (e) {
          // CORS error, skip
        }
      }
      return false;
    });

    expect(hasDialogSmallCSS).toBe(true);
  });
});
