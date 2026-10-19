# DMSJ Signal Lab

AI 推理、Agent 可靠性与嵌入式/边缘系统的研究型技术博客。公开站以 Astro 静态生成，长文、来源和实验可从 Git 完整追溯。

## 核心能力

- **Signal Lab 前端**：十项前沿主题、跨域综合研究、研究雷达、可调参数实验、文章章节轨和本地搜索。
- **Research Journal**：论文/规范来源、证据等级、成熟度、核验日期、局限条件、关联笔记和可复现实验。
- **Git-first 内容**：`apps/web/content/` 是已发布正文的唯一事实源；D1 只承载草稿、访客统计与审计。
- **安全后台**：GitHub OAuth 单管理员、会话级 CSRF、白名单、路径约束、发布冲突检查与审计日志。
- **静态优先**：无数据库读取进入构建；无 JS 时正文、目录、来源和实验默认结果仍可读。

## 目录

```text
apps/web/             Astro 静态站 + Cloudflare Pages Functions
apps/web/content/      Markdown 研究笔记（Git 为事实源）
apps/admin/            Vue 3 管理后台（构建至 /admin）
packages/content-model 前台、后台与 API 共用 schema/注册表
labs/                  可重跑实验快照生成器
docs/                  设计系统、参考库、运行手册与构建日志
.agents/skills/        固定版本的设计/审查技能与项目 playbook
```

## 本地开发

要求 Node 22+、pnpm 11。

```bash
pnpm install
pnpm dev
pnpm dev:admin
```

首次接入 Functions 时复制 `apps/web/.dev.vars.example` 为 gitignore 的 `apps/web/.dev.vars`，然后：

```bash
cd apps/web
pnpm dlx wrangler d1 migrations apply DB --local
pnpm dlx wrangler pages dev dist --d1 DB=00000000-0000-0000-0000-000000000000 --kv SESSION --port 8788
```

## 验证

```bash
pnpm check
pnpm lint
pnpm test
pnpm build
pnpm labs
pnpm test:e2e
pnpm test:a11y
pnpm test:visual
pnpm budgets
```

- `test:e2e` 覆盖 Chromium、Firefox、WebKit 与 320px–2560px 布局。
- `test:a11y` 以 axe 的 WCAG 2.2 AA 规则检查主要页面。
- `test:visual` 保存首页、前沿、文章、实验、关于与后台的三档截图基线。
- `budgets` 对构建产物检查首页、文章、实验页的 gzip JS/CSS 预算和实验 chunk 大小。
- `pnpm labs` 重新生成 `apps/web/src/data/lab-results.json`；快照只代表页面模型假设，不冒充硬件实测。

## 生产配置

在 Cloudflare Pages 配置：

- Secrets：`GITHUB_CLIENT_SECRET`、`IP_SALT`、`SESSION_SECRET`。
- Variables：`GITHUB_CLIENT_ID`、`ALLOWED_GITHUB_LOGIN`、`SITE_URL`、`REPO_OWNER`、`REPO_NAME`、`REPO_BRANCH`、`ENVIRONMENT=production`。
- 可选：`TURNSTILE_SECRET_KEY`；公共 site key 通过 `/api/auth/config` 下发。

生产环境缺少白名单、盐或会话密钥时，管理功能按 fail-closed 处理。D1/KV 初始化、迁移、Preview 与回滚步骤见 [docs/runbook.md](docs/runbook.md)。

## 许可

站点代码采用 MIT（见 `LICENSE`）；文章正文采用 CC BY-NC-SA 4.0（见 `content-license.md`）。
