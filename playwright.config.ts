import { defineConfig } from '@playwright/test';
import path from 'node:path';

// Keep browser binaries and all test credentials local and out of source control.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.resolve('.tools/playwright');

export default defineConfig({
  testDir: './tests',
  workers: 1,
  fullyParallel: false,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    env: { VITE_SPACETIME_URI: 'http://127.0.0.1:3100', VITE_SPACETIME_DATABASE: 'complix-test' },
  },
});
