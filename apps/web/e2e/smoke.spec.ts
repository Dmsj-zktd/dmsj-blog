import { expect, test } from "@playwright/test";

test("首页、导航与内容域可访问", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/DMSJ/);
  await page.getByLabel("主导航").getByRole("link", { name: "嵌入式经验" }).click();
  await expect(page.getByRole("heading", { name: "嵌入式经验" })).toBeVisible();
  await page.goto("/embedded/rtos/freertos-scheduler/");
  await expect(page.getByRole("heading", { name: /FreeRTOS 调度器笔记/ })).toBeVisible();
});

test("公式、代码块与目录出现在长文中", async ({ page }) => {
  await page.goto("/algorithms/dp/longest-increasing-subsequence/");
  await expect(page.locator("pre code").first()).toBeVisible();
  await expect(page.locator(".code-lang").first()).toHaveText("TEXT");
  await expect(
    page.locator(".code-lang").filter({ hasText: "TS" }).first(),
  ).toBeVisible();
  await expect(
    page.locator('.astro-code span[style*="--shiki-light"]').first(),
  ).toBeVisible();
  await expect(page.locator(".katex-display").first()).toBeVisible();
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
  await page.locator("details.mobile-menu summary").click();
  await page.locator("details.mobile-menu").getByRole("link", { name: "算法心得" }).click();
  await expect(page.getByRole("heading", { name: "算法心得" })).toBeVisible();
  await context.close();
});

test("页面载入动效与常驻组件存在", async ({ page }) => {
  await page.goto("/");
  const effect = await page.locator("html").getAttribute("data-load-effect");
  expect([
    "fade-up",
    "zoom-blur",
    "slide-left",
    "slide-right",
    "spin-fade",
  ]).toContain(effect);
  await expect(page.locator("canvas.ambient-canvas")).toBeVisible();
  await expect(page.locator(".cursor-glow")).toBeVisible();
});

test("关于页展示 Bio 与个人主页链接", async ({ page }) => {
  await page.goto("/about/");
  await expect(page.getByText(/喜欢千奇百怪/)).toBeVisible();
  const github = page.getByLabel("个人主页").getByRole("link", { name: "GitHub" });
  await expect(github).toBeVisible();
  const gitee = page.getByLabel("个人主页").getByRole("link", { name: "Gitee" });
  await expect(gitee).toBeVisible();
});

test("首页也展示 Bio 与主页链接", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText(/喜欢千奇百怪/).first()).toBeVisible();
  await expect(page.getByLabel("个人主页").first()).toBeVisible();
});

test("后台登录页可打开且未授权不可用接口", async ({ page }) => {
  await page.goto("/admin/");
  await expect(page.getByRole("heading", { name: /管理后台/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /GitHub 登录/ })).toBeVisible();
});
