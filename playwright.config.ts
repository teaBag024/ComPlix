import { defineConfig } from '@playwright/test';
import path from 'node:path';

// Keep browser binaries and all test credentials local and out of source control.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= path.resolve('.tools/playwright');

// Allow an isolated run when another local test process owns the default ports.
const frontendPort = Number(process.env.COMPLIX_TEST_FRONTEND_PORT ?? 4173);
const backendPort = Number(process.env.COMPLIX_TEST_BACKEND_PORT ?? 3100);
const database = process.env.COMPLIX_TEST_DATABASE ?? 'complix-test';
const origin = `http://127.0.0.1:${frontendPort}`;
export default defineConfig({
  testDir: './tests',
  workers: 1,
  fullyParallel: false,
  timeout: 45000,
  expect: { timeout: 10000 },
  reporter: 'list',
  use: {
    baseURL: origin,
    headless: true,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  webServer: {
    // A per-port dependency cache keeps test servers from rewriting the one `npm run dev` serves.
    command: `node node_modules/vite/bin/vite.js --config tests/vite.test.config.mjs --host 127.0.0.1 --port ${frontendPort} --strictPort`,
    url: origin,
    reuseExistingServer: false,
    env: { VITE_SPACETIME_URI: `http://127.0.0.1:${backendPort}`, VITE_SPACETIME_DATABASE: database, VITE_AUTH_REDIRECT_ORIGIN: origin, COMPLIX_VITE_CACHE_DIR: `node_modules/.vite-test-${frontendPort}` },
  },
});
