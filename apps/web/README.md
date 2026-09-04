# @dmsj/web

Astro 5（当前安装 Astro 7）+ Tailwind 4 静态前台，Cloudflare Pages Functions 位于 `functions/`。

内容目录：`content/<domain>/...`；注册表：`src/site/content-registry.ts`。
新增文章只要符合 schema，构建会自动生成页面、标签、RSS、sitemap 与搜索索引。

## 主要脚本

```bash
pnpm dev             # astro dev
pnpm check           # astro check + tsc
pnpm build           # astro build + pagefind zh index
pnpm test            # vitest
```

## Functions

- `functions/api/[[route]].ts`：Hono 全部 API；
- `functions/_shared/`：会话、GitHub OAuth、统计、审计等纯逻辑；
- `drizzle/`：D1 schema 与 SQL migration（用 wrangler 应用）。

## 主题

主题列表在 `src/site/themes.ts`，token 实现集中在 `src/styles/global.css`；组件不写死颜色。
