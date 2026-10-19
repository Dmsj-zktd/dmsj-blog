---
title: "本博客是怎么被构建出来的：Signal Lab 的工程账本"
description: "从 Git-first 内容、静态研究图谱、参数化实验到边缘 API，拆解这个博客的架构与取舍。"
date: 2026-09-05
updated: 2026-10-18
tags: ["博客架构", "Astro", "Cloudflare", "项目"]
series: "Signal Lab 工程档案"
lang: "zh-CN"
draft: false
featured: true
kind: "project"
maturity: "established"
verifiedAt: 2026-10-18
question: "一个长期维护的技术博客，如何让内容、视觉和验证能力一起演进？"
conclusion: "Git-first 内容、静态 SSG、注册表驱动的主题与实验、边缘 API 和正式的安全/无障碍门禁，把“写文章”变成一套可审查的出版系统。"
takeaways:
  - "已发布正文以 Git 为事实源，数据库只保存会变化的状态。"
  - "前沿主题、文章、实验和跨域综合由同一套注册表派生。"
  - "公开页面不依赖数据库；管理动作走最小权限 API 和审计。"
evidence:
  level: "reproduced"
  scope: "本仓库当前实现、构建输出与自动化测试。"
---

这个博客本身就是项目证据。它不只是“文章列表 + 详情页”，而是一套把研究内容、可复现实验与工程约束连接起来的出版系统。

## 系统边界

```text
apps/web/content/        Markdown / MDX，Git 是已发布内容事实源
apps/web/src/             Astro 页面、内容 schema、主题和实验模型
apps/web/functions/       Cloudflare Pages Functions + Hono API
apps/web/drizzle/         D1 schema 与增量迁移
apps/admin/               Vue 编辑工作台
packages/content-model/   前后台共享的内容域、frontmatter 与评分模型
labs/                     可重跑的软件实验与快照生成器
```

公开阅读路径全部在构建期生成。D1 只保存草稿、访客统计和审计；KV 保存短会话与限流状态。这样做让文章正文、版本历史和离线复制都不依赖运行中的数据库。

## 一次请求如何被组织

```text
Markdown frontmatter
        ↓ schema validation
content registry + frontier registry
        ↓ static generation
首页 / 前沿主题 / 实验室 / 文章 / RSS / sitemap / Pagefind
        ↓ optional edge request
/api/track, /api/auth/*, /api/admin/*
```

新增一项前沿主题时，需要同时提供：

1. 主题的排序、评分、成熟度、来源和文章路径；
2. 一篇旗舰笔记和一篇实验/延伸笔记；
3. 对应的已注册实验 ID；
4. 至少一条跨域关联。

构建测试会检查路径、来源数量、文章类型和主题映射，避免首页链接悄悄指向不存在的页面。

## 为什么实验不是装饰

每个实验都用同一套纯函数模型生成静态初始结果，再在浏览器里按需更新：

- 参数、公式和假设公开；
- 默认结果在无 JavaScript 时仍然可读；
- 模拟值不会被写成目标硬件实测；
- Vitest 对默认配置和关键公式做回归。

`pnpm labs` 会把十个实验的默认输入与结果写成确定性快照。文章可以引用这些结果，但必须同时说明它们只是软件模型。

## 内容优先的视觉系统

Signal Lab 只保留一套品牌语言，支持浅色、深色、跟随系统和高对比。交互集中在研究图谱、章节轨道、实验控制和来源阅读，不使用随机整页入场、鼠标光晕或常驻粒子。

Research Journal 正文使用更安静的阅读密度，代码、公式、表格和来源有独立视觉语法。所有动画都能降级；在现代浏览器中用原生 View Transition 增强页面连续性。

## 安全与发布边界

管理端采用 GitHub OAuth 单管理员模式。生产环境要求允许账号、IP salt 和会话加密密钥齐全，缺少配置时拒绝管理操作，而不是退回默认值。

写操作额外要求会话级 CSRF token；草稿内容域、目录、slug 和最终路径都在落库和发布前校验。发布路径必须留在 `content/`，已有文件冲突不会被静默覆盖。每次变更写审计记录。

## 取舍

| 选择 | 放弃 | 原因 |
| --- | --- | --- |
| Git-first 内容 | 把已发布正文作为数据库唯一副本 | 可追溯、可审查、可移植 |
| 单一品牌 + 明暗模式 | 五套随机皮肤 | 辨识度和视觉一致性 |
| 静态 SSG + 边缘 API | 全动态渲染 | 阅读路径快、失效面小 |
| 原生 SVG/JS 实验 | WebGL 与重动画框架 | 可读性和移动端成本 |
| 构建期 Pagefind | 运行时搜索服务 | 隐私和静态部署友好 |

## 已知边界

当前没有专用 GPU、FPGA 或 MCU 测试平台，因此实验结论主要是预算模型与量级分析。GitHub OAuth 和 D1 发布链路需要真实 Cloudflare 凭据才能做生产端到端验收；公共站点的构建、阅读、搜索和实验不依赖这些凭据。
