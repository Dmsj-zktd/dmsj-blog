# 构建日志（问题 → 验证 → 解决方案）

实时记录构建中出现的问题与最终方案，用于沉淀为仓库技能。条目格式：

```text
## YYYY-MM-DD 主题
- 现象：
- 验证：
- 根因：
- 解决：
- 后续规避：
```

## 2026-09-05 workspace 初始化与 pnpm 11 安全策略

- 现象：首次安装时 pnpm 11 报 `ERR_PNPM_IGNORED_BUILDS`，esbuild/workerd 原生包未执行 postinstall。
- 验证：`pnpm config list` 显示 `allowBuilds` 需要布尔值。
- 根因：pnpm 11 不再读取 package.json 的 `pnpm.onlyBuiltDependencies`，需要在 `pnpm-workspace.yaml` 声明。
- 解决：在 `pnpm-workspace.yaml` 增加 `allowBuilds: { esbuild: true, workerd: true, "@biomejs/biome": true }`。
- 后续规避：新增含原生 postinstall 的依赖时先检查 `pnpm install` 输出；CI 使用 `--frozen-lockfile`。

## 2026-09-05 TypeScript 7 与 Astro check 不兼容

- 现象：`astro check` 报 TypeScript 7 不提供程序化 API。
- 验证：npm 上 6.x 只有 `6.0.0-beta`；Astro 错误信息指向 TS 6。
- 根因：TS7 原生编译器尚未实现 language server API。
- 解决：workspace 根安装 `typescript@6.0.0-beta`，移除子包内 TS7 直接依赖，统一由根解析。
- 后续规避：lockfile 冻结；升级 TS 前先确认 astro check 支持。

## 2026-09-05 Astro 7 内容加载器 API 变化

- 现象：`astro:content` 导出的 `glob is not a function`。
- 验证：官方文档示例为 `import { glob } from "astro/loaders"`。
- 根因：Astro 7 内容层 loader 从独立模块导入。
- 解决：`src/content.config.ts` 从 `astro/loaders` 导入 glob，zod 从 `astro/zod` 导入。
- 后续规避：写 Astro 内容配置前先查当前大版本文档。

## 2026-09-05 Astro 7 Markdown 插件迁移

- 现象：remark/rehype 配置提示需安装 `@astrojs/markdown-remark` 且字段弃用。
- 解决：安装 `@astrojs/markdown-remark`；保持 remarkPlugins/rehypePlugins 可用，后续迁到 `unified({...})`。

## 2026-09-05 Pagefind CLI 参数

- 现象：`--language zh` 不是合法参数。
- 验证：`pagefind --help` 显示 `--force-language`。
- 解决：改用 `--force-language zh`；构建脚本写入 package.json。

## 2026-09-05 ua-parser-js v2 许可证为 AGPL-3.0

- 现象：v2 类型不再按默认类导出，且许可证改为 AGPL。
- 决定：不引入 AGPL 依赖，用 20 行本地 UA 解析替代；访客统计只做粗略分类。
- 后续规避：引入新依赖前检查 license；敏感 UA 信息以哈希保存。

## 2026-09-05 Hono + Pages Functions 的 Context 类型

- 现象：把 Pages EventContext 传给 Hono `app.fetch` 第三参数报 ExecutionContext 类型错误。
- 解决：`app.fetch(request, env)` 仅传 bindings；中间件用 `Variables: { session }` 泛型。

## 2026-09-05 Wrangler 本地 pages dev 细节

- 现象 1：`compatibility_date` 设置成未来两天报 unsupported。
- 解决：改用已发布的 `2026-08-01`。
- 现象 2：D1 迁移后的库与 `--d1 DB` 本地绑定不是同一个库。
- 验证：server 日志 `no such table`。
- 解决：本地显式传 `--d1 DB=00000000-0000-0000-0000-000000000000`（与 wrangler.toml 占位 ID 一致）。
- 现象 3：`_redirects` SPA rewrite 在本地被判 infinite loop。
- 解决：admin 改 `createWebHashHistory()`，移除 `_redirects`。
- 后续规避：本地命令写进 README；wrangler.toml 兼容日期以当前已支持日期为准。

## 2026-09-05 Biome 需要用户缓存目录

- 现象：沙箱中 Biome 尝试创建 `~/.biome` 报 EPERM。
- 解决：lint 以已授权方式运行；CI 环境不受影响。

## 2026-09-05 Playwright E2E 首次运行修复

- 现象：6 个冒烟用例首次运行失败 4 个。
- 验证：Playwright trace/错误上下文显示：选择器命中多个导航链接、测试文章没有代码块、
  移动端 summary 角色定位不到、后台页面 `#app` 内只剩 `<loginview></loginview>`。
- 根因：E2E 选择器歧义；LLM 文章本来就无代码块（选错验证文章）；后台 App.vue 引用了
  LoginView 但没 import（Vue 把它当原生自定义元素）。
- 解决：限定导航 aria-label、改用含代码/公式的文章、直接访问文章 URL、给 App.vue 补 import。
- 服务器侧：Astro 7 `astro preview` 已后台化，不适合 Playwright webServer，新增
  `apps/web/scripts/serve-dist.mjs` 作为前台静态服务器，`--dir dist` 必须在 `apps/web` 下解析。
- 结果：6/6 通过。

## 2026-09-06 动态效果、Bio 与私有使用指南

- 需求：≥3 种随机载入动效、常驻动态组件、轻交互、Bio/描述替换、私密使用指南。
- 选型：检索到 `simple-icons`（Gitee/GitHub 官方路径）与 CSS View Transitions；静态 MPA
  采用“CSS keyframes + 外部 JS 随机 + 自绘 Canvas”，避免引入动画框架运行时。
- 实现：`effect-init.js` 随机选 5 种载入效果；`effects.js` 提供 20 个低透明度环境粒子与
  桌面端鼠标微光；`SocialLinks.astro` 用 simple-icons 渲染 Gitee/GitHub 链接；
  Bio 与站点描述替换；`使用指南.md` 已 gitignore。
- 验证：`pnpm check` 0 错误；E2E 扩至 8 项全部通过（新增载入动效/常驻组件、关于页 Bio 链接）。
- 待站主：确认站点描述句是否要换用示例二/三；提供 GitHub OAuth 与 Cloudflare 资源后完成上线。

## 2026-09-06 实机验收回归：动效“没生效”与代码“没高亮”

- 现象：用户在真实浏览器里反馈载入动效与鼠标微光“未实现”，且代码块没有语言提示/高亮。
- 验证：用 Chromium 检查运行态，`data-load-effect` 已随机、`animationName` 正常、canvas 已绘制；
  结论是用户系统可能开启了“减少动态效果”（Windows 动画关闭时 `prefers-reduced-motion: reduce`），
  且原实现对 reduce 直接 `display:none`，另外光晕初始 `opacity:0` 未移动鼠标也看不见。
- 解决：
  - reduce 时改为“纯透明度渐变 + 低速粒子 + 静态柔光”，不再整体隐藏；
  - 光晕默认给 `opacity:0.35` 并居中柔光，鼠标移动后增强并跟随；
  - 粒子透明度/数量略提升，避免太淡不可见；
  - 品牌字标增加缓慢呼吸光晕，作为常驻动态组件；
  - 首页 hero 增加 Bio 与个人主页链接。
- 代码高亮根因：Shiki 双主题只在 token 上写 `--shiki-light/--shiki-dark`，但没给 span 设置
  `color:var(--shiki-*)`，导致全部继承外层单色。
- 解决：为 `.astro-code span` 分别设 `color:var(--shiki-light)` 与 dark 对应项；并在
  `article.js` 里依据 `data-language` 在代码块左上角加语言徽标（text/ts/js/c 等）。
- 结果：`pnpm check` 0 错误；E2E 扩至 9 项全部通过。

## 2026-09-06 随机金句机制

- 需求：站点描述句不希望固定为一句，而是每次刷新从候选句随机展示。
- 实现：`site.config.ts` 增加 `taglines[]`；首页金句节点带 `data-role="tagline"` 与
  JSON options，`public/scripts/tagline.js` 每次加载随机替换；无 JS 时显示 `tagline` 兜底。
- 说明：SEO/HTML meta 仍用固定描述，避免爬虫每次拿到不同标题；视觉金句随机不影响检索。
- 验证：E2E 10/10 通过。

## 2026-09-06 徽标遮挡修复与本地 OAuth 配置

- 现象：语言徽标遮挡代码首行。
- 根因：`.article pre` 有两处规则，后出现的 `padding: 1rem 1.1rem` 覆盖了预留的顶部 padding。
- 解决：删除提前追加的 padding 覆盖，把主规则统一为 `padding: 2.45rem 1.1rem 1rem`，
  并新增 E2E 断言：徽标底部 <= 代码首行顶部。
- OAuth：站主提供 Client ID/Secret，写入 gitignore 的 `.dev.vars`；
  `SITE_URL=http://localhost:8788`、`ALLOWED_GITHUB_LOGIN=Dmsj-zktd`；本地登录入口已返回 200。

## 2026-09-06 GitHub 安全加固与 Cloudflare 上线

- GitHub：创建公开仓库 Dmsj-zktd/dmsj-blog，启用 Dependabot alerts、secret scanning 与
  push protection，main 禁止 force push/delete；本地敏感文件扫描通过。
- 依赖：发现此前误装废弃 npm 包 `biome@0.3.3`（携带 request/lodash/ini 旧链），替换为官方
  `@biomejs/biome` 并移除 admin 未用测试依赖；Dependabot 11 条告警全部转为 fixed。
- Cloudflare：完成 OAuth 登录，创建 D1 `dmsj-blog-db` 与 KV `SESSION`，Pages 项目
  `dmsj-blog`，批量写入 10 个生产 Secrets，远端迁移成功，部署至
  https://dmsj-blog.pages.dev。
- 坑：Pages 平台保留 `ENVIRONMENT` 绑定名，不能把该名字配成 Secret/var；
  线上验证 `/api/auth/me`、`/api/track`、`login-start` 均 200/204。
- 待开启：仓库变量 `ENABLE_CF_DEPLOY=true` + Cloudflare API Token 后，
  后台发文提交 main 即可触发 CI 自动部署。
