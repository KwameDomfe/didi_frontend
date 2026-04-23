// Playwright configuration for webapp
// Minimal smoke configuration targeting local dev server
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 1280, height: 800 },
    trace: 'on-first-retry'
  },
  reporter: [ ['list'] ],
  webServer: {
    command: 'npm start',
    port: 3000,
    reuseExistingServer: true,
    timeout: 60000
  }
});
