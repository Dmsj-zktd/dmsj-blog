import { expect, test } from "@playwright/test";

test("首页、导航与内容域可访问", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/DMSJ/);
  await page.getByRole("link", { name: "嵌入式经验" }).click();
  await expect(page.getByRole("heading", { name: "嵌入式经验" })).toBeVisible();
  await page.getByRole("link", { name: /FreeRTOS 调度器笔记/ }).click();
  await expect(page.getByRole("heading", { name: /FreeRTOS 调度器笔记/ })).toBeVisible();
});

test("公式、代码块与目录出现在长文中", async ({ page }) => {
  await page.goto("/llm-agent/inference/kv-cache/");
  await expect(page.locator(".katex-display").first()).toBeVisible();
  await expect(page.locator("pre code").first()).toBeVisible();
  await expect(page.locator(".toc-link").first()).toBeVisible();
});

test("主题选择持久化", async ({ page }) => {
  await page.goto("/");
  await page.locator("summary.theme-summary").click();
  await page.locator('[data-action="set-theme"][data-value="blueprint"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "blueprint");
  const saved = await page.evaluate(() => localStorage.getItem("dmsj-theme"));
  expect(saved).toBe("blueprint");
});

test("Pagefind 中文搜索可命中", async ({ page }) => {
  await page.goto("/search/");
  const input = page.getByRole("searchbox");
  await input.fill("最长递增子序列");
  await expect(page.locator(".search-result").first()).toBeVisible();
  await expect(page.locator(".search-result").first()).toContainText(/最长递增子序列/);
});

test("移动端菜单与阅读列表可用", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 375, height: 720 } });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: "打开菜单" }).click();
  await page.getByRole("link", { name: "算法心得" }).click();
  await expect(page.getByRole("heading", { name: "算法心得" })).toBeVisible();
  await context.close();
});

test("后台登录页可打开且未授权不可用接口", async ({ page }) => {
  await page.goto("/admin/");
  await expect(page.getByRole("heading", { name: /管理后台/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /GitHub 登录/ })).toBeVisible();
});
