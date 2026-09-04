---
title: "本博客是怎么被构建出来的：Git-first 内容架构笔记"
description: "把『文章即代码』、静态 SSG 与边缘 API 分离的设计讲清楚。"
date: 2026-09-05
tags: ["博客架构", "Astro", "Cloudflare", "项目"]
lang: "zh-CN"
draft: false
featured: true
---

这个博客本身就是我的项目展示：它尝试回答“一个长期维护的技术博客，如何让内容不腐烂、扩展不改架构”。

## 三个核心决策

### 1. 文章是 Git 文件，不是数据库行

```
content/
├── algorithms/        # 算法心得
├── embedded/          # 嵌入式经验
├── llm-agent/         # LLM/Agent
├── projects/          # 项目展示
└── thoughts/          # 随想
```

Git-first 带来：历史可回溯、可离线编辑、可公开背书、内容可移植。数据库只负责“会变的状态”：访客统计、草稿、审计。

### 2. 前台静态，后台边缘

公开页面全部由 Astro 在构建期生成 HTML，访问路径不依赖数据库。动态能力走 Cloudflare Pages Functions：

- `/api/track`：无 Cookie 访客信标；
- `/api/auth/*`：GitHub OAuth 登录；
- `/api/admin/*`：统计查询与文章发布。

### 3. 模块注册表驱动扩展

新增内容域只需要在注册表追加一项，路由、导航、RSS、sitemap 都从注册表派生。界面主题也走 token：换主题不重写组件。

## 设计取舍

| 选择 | 放弃 | 原因 |
| --- | --- | --- |
| Git-first 内容 | 网页数据库编辑已发布文章 | 可追溯、可备份、可审查 |
| 5 套低调主题 | 花哨渐变/玻璃拟态 | 内容优先，访谈可读性 |
| 构建期中文搜索 | 实时数据库搜索 | 静态索引更快更省 |

更多细节见本仓库 README 与 `docs/`。
