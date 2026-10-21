import { expect, test } from "@playwright/test";

test("首页与三路研究入口可访问", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/DMSJ/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("在硅与推理之间");
  await expect(
    page.getByRole("heading", { name: /十个研究信号|研究雷达|前沿雷达/ }).first(),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "浏览前沿研究" }).first()).toBeVisible();
});

test("首页固定网格不随页面滚动，信号比分数字不会重叠", async ({ page }) => {
  await page.setViewportSize({ width: 759, height: 764 });
  await page.goto("/");

  const fixedGrid = await page.evaluate(() => {
    const pseudo = getComputedStyle(document.body, "::before");
    return {
      content: pseudo.content,
      position: pseudo.position,
      backgroundImage: pseudo.backgroundImage,
    };
  });
  expect(fixedGrid.content).not.toBe("none");
  expect(fixedGrid.position).toBe("fixed");
  expect(fixedGrid.backgroundImage).toContain("linear-gradient");

  const score = page.locator(".signal-card__number");
  const numerator = score.locator(".signal-card__number-main");
  const denominator = score.locator(".signal-card__number-total");
  expect((await score.textContent())?.replace(/\s+/g, "")).toBe("10/10");
  const [numeratorBox, denominatorBox] = await Promise.all([
    numerator.boundingBox(),
    denominator.boundingBox(),
  ]);
  expect(numeratorBox).not.toBeNull();
  expect(denominatorBox).not.toBeNull();
  expect(numeratorBox!.x + numeratorBox!.width).toBeLessThanOrEqual(denominatorBox!.x + 1);
});

test("三种访客视角可切换、持久化并可通过 URL 分享", async ({ page }) => {
  await page.goto("/");
  await page.locator('[data-set-lens="hiring"]').first().click();
  await expect(page.locator("html")).toHaveAttribute("data-lens", "hiring");
  await expect(page.getByRole("link", { name: "查看能力档案" }).first()).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("dmsj-lens"))).toBe("hiring");
  expect(new URL(page.url()).searchParams.get("lens")).toBe("hiring");

  await page.goto("/?lens=explorer");
  await expect(page.locator("html")).toHaveAttribute("data-lens", "explorer");
  await expect(page.getByRole("link", { name: "从研究雷达开始" }).first()).toBeVisible();
});

test("明暗与高对比模式替代旧随机主题", async ({ page }) => {
  await page.goto("/");
  await page.locator('summary[aria-label="外观设置"]').click();
  await page.getByRole("button", { name: /示波器/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.evaluate(() => localStorage.getItem("dmsj-appearance"))).toBe("dark");
  await page.locator('summary[aria-label="外观设置"]').click();
  await page.locator("[data-toggle-contrast]").check();
  await expect(page.locator("html")).toHaveAttribute("data-contrast", "high");
});

test("前沿主题连接到旗舰笔记、实验和一手来源", async ({ page }) => {
  await page.goto("/frontier/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.locator('a[href="/frontier/paged-kv-cache/"]').first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/PagedAttention|KV Cache/);
  await expect(page.getByRole("link", { name: /配套实验|进入配套实验/ }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /Efficient Memory Management/ }).first()).toBeVisible();
});

test("实验参数会实时改变工程指标", async ({ page }) => {
  await page.goto("/lab/kv-budget/");
  const output = page.locator(".lab-metric").first();
  const before = await output.innerText();
  await page.getByRole("slider", { name: /上下文长度/ }).fill("16384");
  await expect(output).not.toHaveText(before);
  await expect(page.locator(".lab-verdict")).toContainText(/容量|缓存|预算/);
});

test("长文显示证据、公式、目录、来源与配套实验", async ({ page }) => {
  await page.goto("/synthesis/memory-hierarchy/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("从 HBM 到 MCU");
  await expect(page.getByText("来源与适用范围")).toBeVisible();
  await expect(page.locator(".katex-display").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: /KV Cache 容量/ })).toBeVisible();
});

test("Pagefind 中文搜索和命令面板可用", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/search/");
  const input = page.getByRole("searchbox");
  await input.fill("内存层级");
  await expect(page.locator(".search-result").first()).toBeVisible({ timeout: 20_000 });
  await page.locator('[data-search-filter="kind"]').selectOption("synthesis");
  await expect(page.locator(".search-result").first()).toBeVisible();

  await page.goto("/");
  await page.keyboard.press(process.platform === "darwin" ? "Meta+K" : "Control+K");
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("searchbox").fill("Agent");
  await expect(dialog.getByRole("link").first()).toBeVisible({ timeout: 20_000 });
});

test("320px 移动端导航与布局无横向溢出", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 320, height: 720 } });
  const page = await context.newPage();
  await page.goto("/");
  await page.locator('summary[aria-label="打开菜单"]').click();
  const mobileNav = page.getByRole("navigation", { name: "移动导航" });
  await expect(mobileNav).toBeVisible();
  await mobileNav.getByRole("link", { name: "前沿" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await context.close();
});

test("无 JavaScript 时核心阅读、专题与实验静态结果仍可用", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "浏览前沿研究" })).toBeVisible();
  await page.goto("/lab/kv-budget/");
  await expect(page.locator(".lab-metric").first()).toBeVisible();
  await page.goto("/synthesis/memory-hierarchy/");
  await expect(page.getByText("来源与适用范围")).toBeVisible();
  await context.close();
});

test("减少动态效果时页面内容仍完整", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const animation = await page.evaluate(
    () => getComputedStyle(document.querySelector(".signal-map__path, .signal-map svg") ?? document.body).animationDuration,
  );
  expect(Number.parseFloat(animation)).toBeLessThan(0.1);
  await context.close();
});

test("后台登录入口可打开且不暴露管理数据", async ({ page }) => {
  await page.goto("/admin/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/管理|DMSJ/);
  await expect(page.getByRole("button", { name: /GitHub 登录/ })).toBeVisible();
  const response = await page.request.get("/api/auth/me");
  expect(response.status()).toBeGreaterThanOrEqual(400);
});

test("1024/1920/2560 布局不产生横向溢出", async ({ page }) => {
  for (const width of [1024, 1920, 2560]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["/", "/synthesis/memory-hierarchy/"]) {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `${route} overflows at ${width}px`).toBeLessThanOrEqual(1);
    }
  }
});

test("200% 文字缩放下文章不横向溢出", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 });
  await page.goto("/synthesis/memory-hierarchy/");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("强制色和存储不可用时内容仍可阅读", async ({ browser }) => {
  const context = await browser.newContext({ forcedColors: "active" });
  await context.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("storage disabled");
    };
    Storage.prototype.setItem = () => {
      throw new Error("storage disabled");
    };
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.goto("/synthesis/memory-hierarchy/");
  await expect(page.getByText("来源与适用范围")).toBeVisible();
  await context.close();
});
