import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"]] : "list",
  use: {
    baseURL: "http://localhost:4322",
    trace: "retain-on-failure",
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
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
