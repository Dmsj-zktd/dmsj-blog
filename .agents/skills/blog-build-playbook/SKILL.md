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
12. 动效/图标优先复用：社交图标用 `simple-icons`（`siGithub`/`siGitee`），静态页动效用
    CSS keyframes + external JS，不引 GSAP/Framer Motion；粒子 Canvas 遵守 reduced-motion。

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
```

遇到新问题：先复现验证 → 写入 `docs/build-log.md` → 再考虑是否更新本 SKILL。
