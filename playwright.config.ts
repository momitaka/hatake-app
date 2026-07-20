import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testIgnore: '**/unit/**',
  fullyParallel: false,
  retries: 1,
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    baseURL: 'http://localhost:3001',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 8000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: 'python3 -m http.server 3001 --directory hatake_files_v24',
    port: 3001,
    reuseExistingServer: true,
  },
});
