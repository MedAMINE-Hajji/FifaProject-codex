import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.TEST_PORT ?? 3100);
const aiPort = port + 100;
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  workers: 1,
  use: { baseURL: `http://127.0.0.1:${port}`, trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' } },
  ],
  webServer: [{
    command: `node tests/browser/ai-stub.mjs ${aiPort}`,
    url: `http://127.0.0.1:${aiPort}`,
    reuseExistingServer: false,
  }, {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 120000,
    env: {
      AI_API_KEY: 'matchday-browser-fixture-key',
      AI_API_URL: `http://127.0.0.1:${aiPort}/analyze`,
      AI_MODEL: 'local-browser-fixture',
      UPLOAD_CONTEXT_SECRET: 'matchday-browser-fixture-upload-secret',
    },
  }],
});
