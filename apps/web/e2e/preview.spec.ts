import { expect, test } from "@playwright/test";

const previewUrl = process.env.PREVIEW_URL?.replace(/\/$/, "");

async function openPreview(page: import("@playwright/test").Page, path: string) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.goto(`${previewUrl}${path}`, {
        waitUntil: "commit",
        timeout: 30_000,
      });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 20_000 });
      return;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

test.describe("deployed preview smoke", () => {
  test.skip(!previewUrl, "Set PREVIEW_URL to test a deployed preview");
  test.describe.configure({ timeout: 120_000 });

  test("core routes render from the preview deployment", async ({ page, request }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await openPreview(page, "/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("在硅与推理之间");
    await openPreview(page, "/frontier/");
    await openPreview(page, "/synthesis/memory-hierarchy/");
    await openPreview(page, "/lab/kv-budget/");

    const me = await request.get(`${previewUrl}/api/auth/me`);
    expect(me.status()).toBe(200);
    await expect(me.json()).resolves.toMatchObject({ user: null });
    expect(errors).toEqual([]);
  });

  test("lab interaction works from the preview deployment", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "Remote WebKit navigation is network-limited on this host");
    await openPreview(page, "/lab/kv-budget/");
    await page.waitForLoadState("domcontentloaded", { timeout: 20_000 }).catch(() => undefined);
    const metric = page.locator(".lab-metric").first();
    const before = await metric.innerText();
    await page.getByRole("slider", { name: /上下文长度/ }).fill("16384");
    await expect(metric).not.toHaveText(before);
  });

  test("preview has no horizontal overflow at 390px", async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await openPreview(page, "/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    await context.close();
  });
});
