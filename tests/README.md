# Sports-Dashcam - Playwright Tests

Comprehensive end-to-end tests for the Sports-Dashcam application using Playwright.

## Test Coverage

### 1. **app.spec.js** - Basic UI Tests
- Application loading
- Empty states
- Tab navigation
- Header buttons visibility

### 2. **camera-management.spec.js** - Camera Management
- Adding cameras
- Removing cameras
- Opening/closing camera dialogs
- Camera settings
- Multiple camera support
- LocalStorage persistence

### 3. **recording.spec.js** - Recording Functionality
- Recording button visibility
- Start/stop recording
- Tag button behavior
- Individual camera recording controls

### 4. **settings.spec.js** - Settings Management
- Opening/closing settings dialog
- Tab switching (General/Hotkeys)
- Pre-tag and post-tag duration settings
- Hotkey detection
- Settings persistence

### 5. **lock-screen.spec.js** - Lock Screen
- Lock/unlock functionality
- Lock screen overlay
- Gesture detection info

### 6. **fullscreen.spec.js** - Fullscreen Mode
- Fullscreen toggle button
- Fullscreen functionality

### 7. **video-player.spec.js** - Video Player
- Video player dialog
- Playback controls
- Download/delete functionality

### 8. **toast.spec.js** - Toast Notifications
- Toast display
- Toast messaging

### 9. **accessibility.spec.js** - Accessibility
- Page title and meta tags
- Button labels and titles
- Form labels
- Icon usage

### 10. **localStorage.spec.js** - Data Persistence
- Camera persistence
- Settings persistence
- Data restoration after reload
- Empty state handling

## Prerequisites

- Node.js (v14 or higher)
- Python 3 (for the dev server)

## Installation

Install Playwright and its dependencies:

```bash
npm install
npx playwright install
```

## Running Tests

### Run all tests (headless)
```bash
npm test
```

### Run tests with UI mode (recommended for development)
```bash
npm run test:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:headed
```

### Run tests in debug mode
```bash
npm run test:debug
```

### Run specific test file
```bash
npx playwright test tests/camera-management.spec.js
```

### Run tests in specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Run with trace
```bash
npx playwright test --trace on
```

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

## Configuration

Test configuration is in `playwright.config.js`:

- **Base URL**: http://localhost:8000
- **Browsers**: Chromium, Firefox, WebKit
- **Retries**: 2 (in CI), 0 (locally)
- **Trace**: On first retry
- **Screenshots**: On failure
- **Web Server**: Auto-starts Python dev server

## Writing New Tests

1. Create a new file in `tests/` with `.spec.js` extension
2. Import test and expect from Playwright:
   ```javascript
   const { test, expect } = require('@playwright/test');
   ```
3. Group related tests using `test.describe()`
4. Use `test.beforeEach()` for setup
5. Write assertions using `expect()`

### Example Test

```javascript
const { test, expect } = require('@playwright/test');

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should do something', async ({ page }) => {
    await page.locator('#myButton').click();
    await expect(page.locator('#result')).toBeVisible();
  });
});
```

## Common Selectors

- By ID: `page.locator('#elementId')`
- By class: `page.locator('.className')`
- By text: `page.locator('text=Button Text')`
- By role: `page.getByRole('button', { name: 'Submit' })`

## Debugging Tips

1. Use `await page.pause()` to pause execution
2. Use `--debug` flag to step through tests
3. Use `--headed` to see the browser
4. Use `--ui` mode for interactive debugging
5. Check screenshots in `test-results/` on failures

## CI/CD Integration

Tests are configured to run in CI environments with:
- Automatic retries (2 attempts)
- Single worker for stability
- HTML reporter for results

## Troubleshooting

### Server won't start
- Ensure port 8000 is available
- Check Python is installed and `server.py` exists

### Tests timing out
- Increase timeout in `playwright.config.js`
- Check network conditions
- Verify selectors are correct

### Flaky tests
- Add explicit waits: `await page.waitForSelector()`
- Use `waitForLoadState()` for page loads
- Check for race conditions
