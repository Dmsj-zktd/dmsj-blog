# 内容目录说明

每个顶层目录是一个**内容域**，由 `apps/web/src/site/content-registry.ts` 登记。
目录层级用 URL 安全的 `a-z0-9-` 单词；标签是平铺的。

```text
content/
├── algorithms/    算法心得
├── embedded/      嵌入式经验
├── llm-agent/     LLM/Agent
├── projects/      项目展示
└── thoughts/      随想
```

写文章时以内容目录内示例文件为模板：frontmatter 必须含 title/description/date，
`draft: true` 只用于本地草稿，不要把它推入公开仓库（草稿应使用管理后台 D1 草稿）。

正文许可见仓库根 `content-license.md`。
