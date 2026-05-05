import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  use: {
    baseURL: "http://localhost:5174",
    trace: "on-first-retry",
  },
  projects: [
    { name: "Desktop 1280x720", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 720 } } },
    { name: "iPhone 14 Pro", use: { ...devices["iPhone 14 Pro"] } },
  ],
  webServer: [
    { command: "npm run dev", port: 5174, reuseExistingServer: true },
    {
      command: "uvicorn main:app --host 0.0.0.0 --port 8000 --workers 1",
      cwd: "../backend",
      port: 8000,
      reuseExistingServer: true,
    },
  ],
});
