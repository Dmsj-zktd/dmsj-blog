# DMSJ 个人技术博客

面向算法、嵌入式、LLM/Agent 工程经验沉淀与面试展示的个人博客。

## 架构一句话

**Git-first 内容 + 静态 SSG + Cloudflare Pages Functions（Hono/D1/KV）+ Vue 管理后台**。

```text
content/           文章正文（Git 是事实源）
apps/web/          Astro 5 前台 + Pages Functions API
apps/admin/        Vue 3 管理后台（构建进 /admin）
docs/              设计系统、维护手册、问题与方案日志
.agents/skills/    本仓库构建技能（问题复盘与可复用命令）
```

## 快速开始

要求：Node 22+、pnpm 11。

```bash
pnpm install
cp apps/web/.dev.vars.example apps/web/.dev.vars
pnpm dev                    # 前台 http://localhost:4321
pnpm dev:admin              # 后台 SPA http://localhost:5174/admin/
pnpm check && pnpm test && pnpm build
```

Cloudflare API 本地联调（apps/web 目录）：

```bash
pnpm dlx wrangler d1 migrations apply DB --local
pnpm dlx wrangler pages dev dist --d1 DB --kv SESSION --port 8788
```

## 关键命令

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 前台 Astro dev server |
| `pnpm dev:admin` | 后台 Vite dev（API 代理到 8788） |
| `pnpm build` | admin 构建 → Astro SSG → Pagefind 中文索引 |
| `pnpm check` | Astro check + vue-tsc + Biome |
| `pnpm test` | Vitest 单元测试 |
| `pnpm preview` | 本地静态预览 |

## 上线准备

1. 把 `apps/web/src/config/site.ts` 中的站点名/作者/GitHub/域名替换为真实值；
2. 在 GitHub 创建公开仓库并开启 Discussions，按 Giscus 生成 `repoId/categoryId` 填入；
3. 创建 GitHub OAuth App（Callback 填 `https://<project>.pages.dev/api/auth/callback`，scope：`read:user public_repo`）；
4. 在 Cloudflare 创建 Pages 项目、D1 与 KV，把 ID 写入 `apps/web/wrangler.toml`；
5. 配置 Cloudflare Secrets/Variables（见 `.dev.vars.example`）；
6. 在 GitHub Actions Secrets 配 `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`；
7. push main，先跑远端迁移后部署；随后执行 `docs/runbook.md` 的验收清单。

## 许可

- 代码与站点工程：MIT（见 `LICENSE`）
- 文章正文：CC BY-NC-SA 4.0（见 `content-license.md`）
