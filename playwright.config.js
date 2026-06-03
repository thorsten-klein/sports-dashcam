const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'html',
  globalSetup: require.resolve('./scripts/global-setup'),
  globalTeardown: require.resolve('./scripts/global-teardown'),
  timeout: 30000,
  workers: process.env.CI ? '100%' : '80%',
  retries: 0,
  use: {
    baseURL: 'http://localhost:8000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  webServer: {
    command: 'npx http-server -p 8000 -c-1',
    url: 'http://localhost:8000',
  },
});
