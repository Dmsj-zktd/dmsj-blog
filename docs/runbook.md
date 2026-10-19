# Signal Lab v2 发布 Runbook

## 1. 发布前门禁

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm check
pnpm test
pnpm labs
pnpm build
pnpm budgets
pnpm test:e2e
pnpm test:a11y
pnpm test:visual
$env:PREVIEW_URL="https://signal-lab-v2.dmsj-blog.pages.dev"; pnpm test:preview
```

`pnpm labs` 后的 `apps/web/src/data/lab-results.json` 必须提交。Firefox 在 CI Linux runner 中执行；本机缺少系统运行库时以 WebKit + Chromium 本地验证并在构建日志记录，不得把未运行伪装成通过。

## 2. Cloudflare 资源

已有资源无需重建。新环境执行：

```bash
pnpm dlx wrangler login
pnpm dlx wrangler d1 create dmsj-blog-db
pnpm dlx wrangler kv namespace create SESSION
```

把返回的 `database_id` 和 KV `id` 写入 `apps/web/wrangler.toml`。D1 迁移仅允许向前追加；发布前导出：

```bash
cd apps/web
pnpm dlx wrangler d1 export DB --remote --output "backup-$(date +%Y%m%d-%H%M).sql"
pnpm dlx wrangler d1 migrations apply DB --remote
```

## 3. Secrets 与 Variables

生产必须提供：

- Secret：`GITHUB_CLIENT_SECRET`
- Secret：`IP_SALT`，随机长字符串，修改会使历史 IP 哈希不可关联
- Secret：`SESSION_SECRET`，随机长字符串，用于 GitHub token 加密
- Variable：`GITHUB_CLIENT_ID`
- Variable：`ALLOWED_GITHUB_LOGIN`
- Variable：`SITE_URL=https://<project>.pages.dev`
- Variable：`REPO_OWNER`、`REPO_NAME`、`REPO_BRANCH=main`
- Variable：`ENVIRONMENT=production`
- 可选 Secret：`TURNSTILE_SECRET_KEY`
- 可选 Variable：`TURNSTILE_SITE_KEY`，由 `/api/auth/config` 公开给登录页

缺少白名单、`IP_SALT` 或 `SESSION_SECRET` 时，管理功能必须 fail-closed。不要提交 `.dev.vars`。

## 4. GitHub OAuth

1. GitHub → Developer settings → OAuth Apps。
2. Callback URL 填 `https://<project>.pages.dev/api/auth/callback`。
3. scope 使用 `read:user public_repo`。
4. 更新 Client Secret，并确认 `ALLOWED_GITHUB_LOGIN` 是唯一管理员。

## 5. Preview 验收

```bash
cd apps/web
pnpm dlx wrangler pages deploy dist --project-name=dmsj-blog --branch=signal-lab-v2
```

Preview 阶段：

- 当前预览地址：`https://signal-lab-v2.dmsj-blog.pages.dev`；
- 使用 Preview URL 重新生成 OAuth callback 的测试配置，或确认 OAuth App 允许该回调；
- 非 `main` 的 Pages 分支在 Functions 层直接拒绝统计写入；不执行真实文章发布；
- 检查 `/`、`/frontier/`、10 个主题页、`/lab/`、10 个实验、30 篇文章、`/search/`、RSS、sitemap；
- 在 Chromium、Firefox、WebKit 与 320/390/768/1024/1440/1920/2560 宽度做冒烟；
- 验证关闭 JavaScript、禁用 localStorage、减少动态、200% 缩放、forced-colors 与 save-data；
- 用 axe 确认无 serious/critical；Lighthouse 移动端四项 ≥ 95；
- 后台登录、拒绝非白名单账号、草稿校验、CSRF、发布、重复发布冲突和审计；
- 安全头、CSP、无 `innerHTML` 搜索结果注入与生产缺 secret fail-closed。

## 6. 生产切换

1. 经用户确认 Preview 的视觉、内容与功能后，合并到 `main`。
2. 确认 CI `quality`、`security`、`codeql`、`e2e` 全绿。
3. 部署 job 下载 `web-dist` artifact 后迁移并发布，不能重新使用空工作区构建产物。
4. 保留上一个 Cloudflare Pages deployment 作为回滚点。

## 7. 回滚

- 静态前端：Cloudflare Pages → Deployments → 选择上一成功版本 → Rollback。
- D1：优先向前修复；根因确认前不要回滚用户数据。必须恢复时使用发布前导出的 SQL，并由用户确认数据时间窗。
- KV：会话可整体失效；用户重新登录即可。不要删除未备份的生产审计数据。

## 8. 发布后冒烟

- `/api/auth/me` 未登录返回 `{ user: null }`，已登录返回会话 CSRF token；
- 公开页面 200，文章、标签、RSS、sitemap 与搜索索引可访问；
- 未带有效 CSRF token 的管理写请求返回 403；
- 非白名单 OAuth 登录被拒绝并写审计；
- 发布一篇测试草稿后 GitHub commit 生成，Pages 重建后 URL 可访问；
- 统计日期范围、维度过滤与 CSV 导出正常；
- 视觉与交互在 Preview 与生产抽检一致。
