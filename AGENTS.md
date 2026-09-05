# DMSJ 个人博客 · 项目约束与工作流（最高优先级）

本文件是仓库内所有自动构建/维护任务的最高工作约束。任何后续任务开始前先完整阅读本文件与 `.agents/skills/blog-build-playbook/SKILL.md`（如存在）。

## 1. 项目事实源（不许凭记忆，必须看代码/命令输出）

- 内容事实源：`apps/web/content/` 下 Markdown/MDX 文件；`apps/web/src/site/content-registry.ts` 是内容域注册表。
- 站点/主题/评论等静态配置：`apps/web/src/config/site.ts` 与 `apps/web/src/site/themes.ts`。
- 数据库 schema：`apps/web/drizzle/schema.ts` + `apps/web/drizzle/*.sql`；动态状态（访客、草稿、审计）存 D1，会话/限流存 KV。
- API 全部位于 `apps/web/functions/api/[[route]].ts`（Cloudflare Pages Functions + Hono）。
- 管理后台 SPA：`apps/admin/`（Vue 3 + Vite，构建产物进入 `apps/web/public/admin/`，随 Astro 一并发布）。
- 结论只能来自文件内容、命令输出或已验收运行结果；不确定时必须先验证（读文件、跑 check/test/build）再下结论，禁止虚构或猜测。

## 2. 每次变更的强制门禁

1. 先读相关现有文件，明确改动面与调用方。
2. **复用优先**：实现新能力前先检索成熟开源库/官方方案（icons、动画、状态管理等），有社区验证实现时优先复用并记录选型理由，避免重复造轮子；只有自研方案明显更轻或现有库不匹配时才自写。
3. 批量、并行地准备相互独立的改动与验证命令。
4. 实施后立即运行相应验证：`pnpm check`、`pnpm test`、`pnpm build`（必要时本地 `pnpm preview` + Playwright/HTTP 冒烟）。
5. 门禁失败不得绕过：回到改动处修复，直到全绿；确实无关的存量失败要单独记录到 `docs/build-log.md`，不得静默掩盖。
6. 提交采用 Conventional Commits（`feat:` / `fix:` / `docs:` / `test:` / `chore:` / `refactor:`），提交信息必须反映实际内容。

### 测试与审计要求（适用于一切修改/优化/功能增删）

- 逻辑变更必须带对应测试：
  - 认证/会话/权限 → 未授权 401/403、越权 403、CSRF 拦截、登录白名单；
  - 数据库操作 → 参数化查询、时间范围边界、聚合正确性、草稿/发布状态流转；
  - 内容渲染 → frontmatter schema、分类/标签派生、draft 不进公开构建；
  - 外部集成 → GitHub 服务以 mock 覆盖成功/失败/缺 token。
- 提交前按风险完成安全复核：输入 Zod 校验、SQL 全绑定、输出转义/XSS、CSP 与安全头、审计留痕。
- 影响性能/首屏/包体的改动，记录并对比构建产物与关键路径；禁止为了动效牺牲 LCP/CLS。
- 所有通过管理后台/API 的变更（登录、文章、配置等）都必须写 `audit_logs`：记录谁、何时、资源、结果、上下文，禁止静默改库。
- 阶段收尾跑一次完整回归：`pnpm lint` → `pnpm check` → `pnpm test` → `pnpm build` → `pnpm test:e2e`；E2E 在无法运行浏览器时写明原因并保留配置。

## 3. 自主运行规则（用户不在场）

- 用户在构建期不在场：默认持续自主推进，不因“要不要这样设计”之类可自行判断的问题停下；材料性用户决策已在 v1 方案中锁定。
- 不实时汇报：除非出现真实阻塞或需要用户一次性授权，否则不打断；把中间过程、问题与解法实时写入 `docs/build-log.md`。
- 只有这些情况才停下并请求用户/外部权限：需要外部账号登录（GitHub OAuth App、Cloudflare Dashboard/CLI）、需要用户提供 Secrets/域名/仓库所有权、操作对象超出本仓库写权限、可能造成不可恢复数据丢失。
- 真实阻塞前先自我排除：至少做两轮可执行排查，确认不是配置、依赖或权限问题。

## 4. 并行与批处理

- 相互独立的文件读取/命令在同一轮执行，避免串行空等。
- 能一次完成的批量重构用格式化/机械改写脚本；禁止用 `cat`、`echo>` 等重定向技巧创建文件（统一用 `apply_patch`）。
- 测试、类型检查、构建这类相互独立但可能抢资源的命令要分批，避免无意义资源竞争。

## 5. 不可破坏的架构不变量

- Git-first：已发布文章永远以仓库文件为准；D1 只存草稿/统计/审计等动态数据，不得把已发布正文当作唯一存储。
- 草稿绝不提交到公开仓库：`draft:true` 的文件不得进入构建输出；管理后台未发布草稿只存 D1。
- 新增内容域 = `content/<domain>/` + 注册表加一条记录，路由/导航/sitemap/RSS/搜索自动派生。
- 主题只能通过 token 变量换肤：组件/页面不得写死主题色；主题列表与默认策略只由 themes 配置控制。
- 所有外部请求参数先 Zod 校验；所有 SQL 参数化；所有写操作审计；Secrets 只进 `.dev.vars`/Cloudflare Secrets，绝不入库。
- `robots.txt`、API 鉴权、CSP 等安全基线不能因“页面简单”而删除。
- 公共页面保持纯静态 SSG；动态能力全部走 `/api/*`，避免把数据库读入构建产物。

## 6. 常用命令（在仓库根或包目录执行）

```bash
pnpm install                # 安装全部 workspace 依赖
pnpm dev                    # 本地 Astro dev（静态前台）
pnpm dev:admin              # 本地 Vue admin dev server
pnpm check                  # 类型检查 + lint（根脚本聚合）
pnpm test                   # 单元/集成测试
pnpm build                  # admin 构建 -> Astro 构建 -> Pagefind 中文索引
pnpm preview                # 本地预览（apps/web）
```

Cloudflare 本地（apps/web 目录）：

```bash
pnpm dlx wrangler pages dev dist --d1 DB --kv SESSION
pnpm dlx wrangler d1 migrations apply DB --local
pnpm dlx wrangler d1 migrations apply DB --remote   # 需已登录/Token
pnpm dlx wrangler pages deploy dist --project-name=dmsj-blog
```

## 7. 设计/文档要求

- 每个子系统（内容层、front、functions、admin、drizzle）目录内维护简短的 `README.md` 或注释说明职责与扩展方式。
- 构建中发现的问题与最终解法实时追加到 `docs/build-log.md`，并按里程碑合并进 `.agents/skills/blog-build-playbook/SKILL.md`（用 skill-creator 校验）。
- v1 明确延后项（多角色权限、TOTP、R2 媒体库、Webmention、PWA 离线、全局主题强制切换）不得悄悄加回来，除非方案文档更新。
