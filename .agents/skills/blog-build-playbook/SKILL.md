---
name: blog-build-playbook
description: "维护 DMSJ 博客仓库（Astro + Cloudflare Pages Functions + Vue admin）时的构建/联调/发布操作手册。适用于本仓库内的构建、排障、部署与新增内容模块任务；不要用于其他仓库。"
---

# Blog Build Playbook

本技能服务于仓库 `DMSJ-blog`：构建、验证、联调、上线与新增内容模块时的可复用操作。
内容以仓库根 `AGENTS.md` 为最高约束，本文件只补充“怎么跑、坑在哪、怎么扩展”。

## 什么时候读

- 任何改动后需要 `check → test → build → preview`；
- 本地启动 Astro / Vue admin / Cloudflare Functions；
- 新增内容域、文章或发布链路上线；
- 遇到本文件或 `docs/build-log.md` 中未记录的构建问题。

## 命令

从仓库根运行：

```bash
pnpm install
pnpm check          # astro check + vue-tsc + tsc
pnpm test
pnpm build          # admin -> astro build -> pagefind
pnpm budgets        # gzip JS/CSS 与单实验 chunk 预算
pnpm dev            # Astro dev
pnpm dev:admin      # Vue admin dev
pnpm lint           # Biome（受限沙箱需授权用户缓存）
```

Cloudflare 本地（`apps/web` 目录，先 build）：

```bash
pnpm dlx wrangler d1 migrations apply DB --local
pnpm dlx wrangler pages dev dist --d1 DB=00000000-0000-0000-0000-000000000000 --kv SESSION --port 8788
```

Pages dev 必须传完整 `--d1 DB=<占位 database_id>`，否则会创建未迁移的本地库并报 `no such table`。

## 已知坑（完整清单见 docs/build-log.md）

1. pnpm 11 原生依赖构建需要在 `pnpm-workspace.yaml` 的 `allowBuilds` 里声明（esbuild/workerd/@biomejs/biome）。
2. 当前 Astro 7 需要 TypeScript 6.0.0-beta 才能跑 `astro check`；不要直接升级到 TS 7。
3. Astro 内容 loader 从 `astro/loaders` 导入 `glob`，zod 从 `astro/zod` 导入。
4. Pagefind 中文参数是 `--force-language zh`，不是 `--language`。
5. UA 解析禁止引回 AGPL 的 ua-parser-js；本项目用本地 `parseClient`。
6. Hono 与 Pages Functions 集成用 `app.fetch(request, env)`；中间件泛型要带 `Variables`。
7. `wrangler.toml` compatibility_date 不能是未来日期；本地联调前先迁移本地 D1。
8. Admin 是 hash 路由，不要为 `/admin/*` 加 `_redirects` SPA rewrite（本地会判 infinite loop）。
9. Biome 需要写 `~/.biome`；受限沙箱中运行时需授权，CI 不受影响。
10. Vue SFC 在模板中使用某个组件时必须在 `<script setup>` import；漏 import 会渲染成裸自定义元素。
11. E2E 在 `apps/web` 下用 `node scripts/serve-dist.mjs --dir dist` 做前台静态服务器，不要用已后台化的 `astro preview`。
12. Signal Lab 不再使用随机主题、粒子 Canvas 或鼠标光晕。动效走 CSS/View Transitions，
    只用于状态反馈；高对比通过 `data-contrast="high"`，主题只接受 `auto|light|dark`。
13. Shiki 双主题须给每个 token 的 `.astro-code span` 设 `color:var(--shiki-light/dark)`，
    否则 token 会全部继承外层单色；`data-language` 可在 article.js 渲染为语言徽标。
14. 站点文案保持稳定，不使用运行时随机金句。阅读视角用 `?lens=` + localStorage，
    默认 `builder`，HTML 必须保留完整无 JS 内容。
15. 文章 `data-pagefind-body` 只应有一个；搜索摘要先解析再由 textContent/允许的 `<mark>`
    重建，禁止把 Pagefind HTML 直接写入 DOM。
16. 实验统一由 `apps/web/src/lib/labs.ts` 注册，页面通过 slug 引用；修改公式后运行 `pnpm labs`。
    浏览器端评估器位于 `src/lib/lab-evaluators/`，由 `lab-client.ts` 按 slug 动态加载；
    新增实验必须同步服务器模型、按需评估器和一致性测试。

## 新增内容域

1. 在 `apps/web/content/<key>/` 建目录并写文章；
2. 在 `apps/web/src/site/content-registry.ts` 的 `contentModules` 追加一条记录；
3. 跑 `pnpm check` 与 `pnpm build`：路由/导航/sitemap/RSS/搜索自动派生；
4. 若需后台“新建草稿”下拉框同步新域，同步 `apps/admin/src/views/ArticlesView.vue` 的 domain 选项。

## 写文章约束

- frontmatter 必须通过 `apps/web/src/content.config.ts` schema；
- `draft: true` 的文章不得进入公开构建；未发布内容只放 D1 草稿，绝不先提交仓库；
- 表格/代码/公式用 Markdown 原生能力；不放外部图片依赖。

## 质量门禁

每次提交前：

```bash
pnpm lint
pnpm check
pnpm test
pnpm build
pnpm budgets
```

遇到新问题：先复现验证 → 写入 `docs/build-log.md` → 再考虑是否更新本 SKILL。
