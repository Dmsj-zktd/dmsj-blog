# @dmsj/admin

Vue 3 + Vite 管理后台，生产构建输出到 `../web/public/admin`，随 Astro 静态发布在 `/admin/`。

## 本地开发

先启动 Cloudflare Functions（`apps/web`）：`wrangler pages dev`（端口 8788），然后：

```bash
pnpm dev:admin
```

Vite 会把 `/api` 代理到 `http://localhost:8788`。

## 页面

- 访客统计：时间范围 + 维度分组 + CSV 导出；
- 文章管理：已发布文件（GitHub raw 编辑/提交）与 D1 草稿（发布写入仓库）；
- 审计日志：登录与写操作留痕。

## 说明

后台使用 hash 路由（`/admin/#/dashboard`），因此不需要 SPA rewrite。
