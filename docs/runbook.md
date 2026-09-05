# 上线 Runbook

按顺序执行；每步有验证动作，失败不要跳过。

## 1. 仓库与 Discussions

1. 创建公开 GitHub 仓库并推送 main。
2. 在仓库 Settings 打开 Discussions，新建 “Announcements” 分类。
3. 打开 <https://giscus.app/zh-CN>，选择仓库与分类，记录 `repoId/categoryId`。
4. 填入 `apps/web/src/config/site.ts` 的 `giscus`，`enabled=true`。

## 2. GitHub OAuth App

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App。
2. Callback URL：`https://<project>.pages.dev/api/auth/callback`。
3. 申请 scope 无需在 UI 配置，授权页会在运行时申请 `read:user public_repo`。
4. 记录 Client ID/Secret。

## 3. Cloudflare 资源

```bash
pnpm dlx wrangler login
pnpm dlx wrangler d1 create dmsj-blog-db
pnpm dlx wrangler kv namespace create SESSION
pnpm dlx wrangler r2 bucket create dmsj-blog-media   # 本期可选预留
```

把返回的 `database_id` 与 KV `id` 写入 `apps/web/wrangler.toml`。

## 4. Cloudflare Pages 变量

Dashboard → Pages 项目 → Settings → Variables and Secrets：

Secret：`CLOUDFLARE_API_TOKEN`（Actions 用，不由 Wrangler 持有）
Secret：`GITHUB_CLIENT_SECRET`
Secret：`IP_SALT`（随机长字符串）

Variable：`ENVIRONMENT=production`、`GITHUB_CLIENT_ID`、`ALLOWED_GITHUB_LOGIN`、
`REPO_OWNER`、`REPO_NAME`、`REPO_BRANCH=main`、`SITE_URL`、`ANALYTICS_TZ_MINUTES=480`
Variable（可选）：`TURNSTILE_SECRET_KEY`

## 5. GitHub Actions Secrets

`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`。
并在仓库 Variables 设置 `ENABLE_CF_DEPLOY=true`，之后每次 main push 都会自动部署。

## 6. 首次远端迁移 + 部署

push 到 main 后 Actions 会先迁移再部署；若需手动：

```bash
cd apps/web
pnpm dlx wrangler d1 migrations apply DB --remote
pnpm dlx wrangler pages deploy dist --project-name=dmsj-blog
```

## 7. 验收清单

- [ ] `/`、五个内容域、归档、标签、搜索全部 200；
- [ ] 中文搜索能命中示例文章；
- [ ] 文章页代码高亮、复制按钮、TOC、KaTeX 正常；
- [ ] 打开 `/admin/` 能跳转 GitHub 登录，非白名单账号被拒绝；
- [ ] 后台新建草稿 → 发布 → GitHub 出现 commit → Pages 重建后文章可见；
- [ ] 访客统计按自定义日期范围、维度过滤与 CSV 导出可用；
- [ ] `curl -I` 响应头含 CSP 与安全头；
- [ ] Giscus 评论区在启用配置后出现在文章底部。
