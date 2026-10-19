import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  timeout: 45_000,
  workers: process.env.CI ? 4 : 6,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"]] : "list",
  use: {
    baseURL: "http://localhost:4322",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/serve-dist.mjs --dir dist --port 4322",
    url: "http://localhost:4322",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
    env: {
      ASTRO_TELEMETRY_DISABLED: "1",
    },
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
    ...(process.env.CI || process.env.PLAYWRIGHT_INCLUDE_FIREFOX === "1"
      ? [{ name: "firefox", use: { browserName: "firefox" as const } }]
      : []),
  ],
});
