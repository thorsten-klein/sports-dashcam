const { test, expect } = require('@playwright/test');

test.describe('Record Button Styling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('record button should not have box-shadow', async ({ page }) => {
    // Just check the CSS doesn't add unwanted shadows
    const hasNoShadowCSS = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            if (rule.selectorText && rule.selectorText.includes('#startRecordingBtn')) {
              const shadow = rule.style.boxShadow;
              if (shadow && shadow !== 'none' && shadow !== '') {
                return false; // Has shadow, test should fail
              }
            }
          }
        } catch (e) {
          // CORS error, skip
        }
      }
      return true; // No shadows found
    });

    expect(hasNoShadowCSS).toBe(true);
  });

  test('record icon color should be red in CSS', async ({ page }) => {
    const hasRedIconCSS = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets);
      for (const sheet of sheets) {
        try {
          const rules = Array.from(sheet.cssRules || []);
          for (const rule of rules) {
            const selector = rule.selectorText || '';
            // Look for the exact selector with :not(:disabled) and descendant combinator
            if (selector === '#startRecordingBtn:not(:disabled) .material-icons') {
              const color = rule.style.color;
              if (color && (color.includes('#f44336') || color.includes('rgb(244, 67, 54)'))) {
                return true;
              }
            }
          }
        } catch (e) {
          // CORS error, skip
        }
      }
      return false;
    });

    expect(hasRedIconCSS).toBe(true);
  });
});
