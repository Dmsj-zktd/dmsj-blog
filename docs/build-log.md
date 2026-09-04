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
