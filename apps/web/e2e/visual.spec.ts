import { expect, test } from "@playwright/test";

const pages = [
  { name: "home", path: "/" },
  { name: "frontier", path: "/frontier/" },
  { name: "article", path: "/llm-agent/frontier/paged-kv-cache/" },
  { name: "lab", path: "/lab/kv-budget/" },
  { name: "about", path: "/about/" },
  { name: "admin", path: "/admin/" },
] as const;

const widths = [390, 768, 1440] as const;

for (const target of pages) {
  for (const width of widths) {
    test(`@visual ${target.name} at ${width}px`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "chromium", "Visual baselines are captured in Chromium.");
      test.skip(
        Boolean(process.env.CI),
        "Visual baselines are platform-specific and are refreshed locally before release.",
      );
      await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
      await page.goto(target.path);
      await expect(page.locator("main, #app").first()).toBeVisible();
      await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
      await expect(page).toHaveScreenshot(`${target.name}-${width}.png`, {
        animations: "disabled",
        caret: "hide",
        fullPage: true,
        maxDiffPixelRatio: 0.025,
      });
    });
  }
}

test("@visual home dark grid remains visible at 759px", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "chromium", "Visual baselines are captured in Chromium.");
  test.skip(
    Boolean(process.env.CI),
    "Visual baselines are platform-specific and are refreshed locally before release.",
  );
  await page.setViewportSize({ width: 759, height: 764 });
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".home-hero")).toHaveScreenshot("home-grid-dark-759.png", {
    animations: "disabled",
    caret: "hide",
    maxDiffPixelRatio: 0.02,
  });
});
