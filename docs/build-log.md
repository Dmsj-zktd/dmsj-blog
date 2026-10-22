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

## 2026-10-18 Signal Lab v2 重构

- 现象：并行任务同时改写公共布局，导致搜索触发器、lens 脚本和页面版本互相覆盖；
  内容初稿覆盖了 10 个主题，但旗舰/实验的实际汉字数明显低于目标。
- 验证：用 `git status`、文件时间戳与逐页截图确认冲突；用 CJK 正则统计每篇笔记字数；
  用 Playwright 在 320–1440px 检查 DOM、搜索、无 JS 与溢出。
- 根因：公共前端没有先锁定文件所有权；内容代理完成了结构覆盖，但没有在提交前做长度与
  证据数量门禁。
- 解决：公共页面统一由主线程收口；`site.js` 统一搜索、lens 与命令面板；实验统一到
  `lib/labs.ts`；新增 content completeness、labs、axe、视觉与多浏览器检查。
- 后续规避：子任务必须声明独占路径；最终集成前以 `git status` 与构建产物复核，不能只看
  子代理完成声明；内容长度/来源数量纳入自动测试。

## 2026-10-18 Playwright 本机 Firefox 运行库

- 现象：Chromium/WebKit 正常，Playwright Firefox 153 在本机 Windows 启动时报
  `side-by-side configuration is incorrect`。
- 验证：直接执行 Playwright Firefox 二进制得到同样错误；重新下载 Firefox 后仍复现，
  说明不是测试或站点代码问题。
- 解决：本地 `test:e2e` 覆盖 Chromium + WebKit；CI Ubuntu runner 设置 `CI=1` 时自动加入
  Firefox project，并安装三套浏览器。Firefox 的通过结论只以 CI 或具备运行库的环境为准。
- 后续规避：不要用 Chromium 的结果冒充 Firefox 通过；发布前检查 CI 浏览器 job。

## 2026-10-19 依赖审计、CSP 内联启动与文章性能

- 现象：官方 npm audit 在生产依赖中发现 24 个漏洞；文章页 Lighthouse 只有 86 分，LCP 3.3s。
- 验证：漏洞主要来自 Astro/Vue 间接依赖；文章首次加载了完整 LabExplorer（约 124KB JS）。
- 根因：lockfile 中的间接版本过旧；阅读页把“配套实验”做成了强制加载的可交互大组件；KaTeX 和阅读字体阻塞首屏。
- 解决：使用 pnpm overrides 升级 undici、devalue、http-cache-semantics、source-map-js、smol-toml、katex、sharp，并升级 Hono；文章页改用实验摘要 + 独立 `/lab/` 入口；公式/阅读字体异步加载并提供 noscript；内联主题启动脚本并加入 CSP hash；搜索触发器补 aria-label；阅读进度计算移入 rAF。
- 结果：`pnpm audit --prod --registry=https://registry.npmjs.org` 无已知漏洞；移动端首页 Lighthouse 97/100/100/100（LCP 1.7s，CLS 0），综合文章 93/100/100/100（LCP 2.6s，CLS 0）。

## 2026-10-19 内容长度门禁

- 现象：首轮并行内容虽然覆盖 10 个主题，但多数正文只有几百个中文字符，低于计划要求的深度。
- 验证：剔除 frontmatter/code 后按 CJK 字符统计，旗舰文与实验文均明显不足。
- 解决：按旗舰 ≥3,000、实验 ≥1,500、综合 ≥2,500 个正文中文字符扩写，并加入自动测试；`tests/content.test.ts` 通过。
- 后续规避：结构完整性测试不能替代有效内容长度；来源数量、正文长度和 lab 映射必须同时通过。

## 2026-10-19 最终性能收口

- 现象：完整实验逻辑仍被打成一个 123.9KB（37.8KB gzip）的客户端包，超过“单实验 ≤20KB”预算；
  本地测试服务器不压缩 HTML/CSS，也让文章 LCP 被低估为 2.6s。
- 验证：检查 Vite 产物与 Lighthouse 网络请求，确认实验评估器和未压缩文档同时影响预算。
- 解决：十个评估器按 slug 拆分为 0.56–0.65KB gzip 的按需模块；共享启动脚本为 1.9KB gzip；
  评估器与服务器模型加入输出一致性测试。本地静态服务器增加 Brotli/gzip、缓存头、nosniff 和
  输出目录边界检查。
- 结果：Lighthouse 13.5 移动模拟下，首页 100/100/100/100（LCP 1.4s）、文章
  97/100/100/100（LCP 2.2s）、实验页 100/100/100/100（LCP 1.6s），CLS 与 TBT 均为 0。

## 2026-10-19 Codex Security 差异审查

- 覆盖：当前工作树完整 diff，64/64 review items。
- 发现：生产配置可用可选环境标记回退到开发行为；OAuth 登录发起未限流，
  两者均判定为 low。
- 解决：仅显式 `ENVIRONMENT=development` 使用开发行为；登录发起增加每 IP 每小时
  30 次限流；同时加固 JSON-LD 转义、来源 URL 协议、草稿乐观锁、发布版本删除、
  管理写失败审计与 CSV 前置空白。
- 结果：`pnpm check`、36 项单测、Lint、155 页构建、40 项 Chromium/WebKit E2E、
  12 项 axe、18 项视觉回归和本地 Functions 冒烟均通过。

## 2026-10-19 Preview 发布

- 发布：Cloudflare Pages `dmsj-blog`，分支 `signal-lab-v2`。
- 地址：`https://signal-lab-v2.dmsj-blog.pages.dev`。
- 首次发布后发现 Preview 的统计信标仍可能写入绑定的 D1；已在 Functions 层检测
  `CF_PAGES_BRANCH !== "main"` 并直接返回 204，同时加入单元测试。
- 重新发布后：远程 Chromium 核心页面、390px 布局和实验交互通过；远程 WebKit
  核心页面和 390px 布局通过，交互回归仍由本地 WebKit 全量 E2E 覆盖。
- 远程 API：`/api/auth/me` 200、`/api/auth/config` 200、Preview 统计 204、
  未认证后台写入按配置 fail-closed。

## 2026-10-21 首页网格、比分排版与缓存回访

- 现象：网格背景随页面滚动；`10/10` 的分母继承父级负字距后字符异常贴合；
  生产字体、Pagefind 与带哈希的 `/_astro/` 资源均返回 `max-age=0`。
- 根因：网格绘制在 `body` 的滚动背景层；比分共用一个字号跨度的负字距；
  `_headers` 未声明指纹资源的长期缓存规则。
- 解决：网格移入固定定位伪元素，正文容器保持透明；比分拆成独立数字与分母并只对
  主数字应用紧凑字距；指纹资源一年 immutable，Pagefind 入口缓存一小时、分片长期缓存，
  路由 HTML 继续保持即时校验。小号暖橙文字改用独立 `--embedded-text` token，
  图形填充仍使用 `--embedded`。
- 验证：Lint、类型检查、39 项单测、155 页构建、42 项 Chromium/WebKit E2E、
  12 项 axe、18 项视觉回归及性能预算全部通过。WebKit 首次加载 Pagefind 较慢，
  E2E 改为最长 20 秒的条件等待，避免把正常 WASM 初始化误判为失败。

## 2026-10-22 固定网格可见性与验证节流

- 现象：第一版固定网格在亮色下只余极淡纹路，暗色模式几乎不可见；用户看到的实际效果等同于网格消失。
- 根因：`body` 没有建立独立层叠上下文，负 z-index 伪元素可能退到根背景之后；固定渐变遮罩在视口下半部
  完全不透明，覆盖网格；暗色网格线透明度只有 5%。
- 解决：`body` 使用 `isolation: isolate` 并绘制画布底色，网格作为其固定负层，移除遮挡网格的全屏渐变；
  亮色/暗色网格线分别提高到 7.5%/8.5%。新增 759px 暗色视觉基线，防止再次出现“样式存在但视觉消失”。
- 流程：所有修改类回归留在本地；部署后只检查首页、一个指纹资源、Pagefind 和缓存头，避免用生产流量做
  重复 E2E、视觉矩阵或爬取并污染缓存命中率。

## 2026-10-22 依赖安全清零

- 现象：GitHub 默认分支提示 14 个 Dependabot 告警；完整 npm 审计展开为 19 条受影响记录，
  涉及 `undici`、`fast-uri`、`Vite` 和 `Vitest/@vitest/mocker`。
- 根因：Wrangler/Miniflare 的传递 `undici@7.29.0`、Astro 校验链中的 `fast-uri@3.1.7`、
  `Vite@8.2.2`，以及 `Vitest@5.0.0` 自带的旧 mocker 均低于修复版本。
- 解决：`undici` 固定到 7.29.1，`fast-uri` 固定到 3.1.8，Vitest 升级到 5.0.5；
  Vite 统一到供应链冷静期内的安全补丁 8.2.4，避免同时存在多个 Vite 版本。
  TypeScript 从预发布 `6.0.0-beta` 升级到稳定 `6.0.3`，消除 Astro peer 不匹配。
- 结果：完整审计与生产依赖审计均为 0；`pnpm peers check` 无问题；离线 frozen lockfile
  校验通过。Lint、类型检查、39 项单测、155 页构建、19 项视觉、42 项 Chromium/WebKit E2E
  与性能预算全部通过。
