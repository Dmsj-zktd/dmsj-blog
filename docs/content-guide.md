# 内容目录说明

每个顶层目录是一个**内容域**，由 `apps/web/src/site/content-registry.ts` 登记。
目录层级用 URL 安全的 `a-z0-9-` 单词；标签是平铺的。

```text
content/
├── algorithms/    算法心得
├── embedded/      嵌入式经验
├── llm-agent/     LLM/Agent
├── projects/      项目展示
├── thoughts/      研究随笔
└── synthesis/     跨域综合研究
```

写文章时以内容目录内示例文件为模板：frontmatter 必须含 title/description/date，
`draft: true` 只用于本地草稿，不要把它推入公开仓库（草稿应使用管理后台 D1 草稿）。

正文许可见仓库根 `content-license.md`。

## Research metadata

Frontier and synthesis notes additionally use:

```yaml
kind: flagship | experiment | synthesis | note | essay | project
topic: paged-kv-cache
maturity: emerging | established | experimental
question: "核心问题"
conclusion: "有边界的结论"
takeaways: ["可复用结论"]
evidence:
  level: analyzed | runnable | reproduced
  scope: "证据适用范围"
  caveats: ["不能外推的条件"]
sources:
  - title: "一手来源标题"
    url: "https://..."
    authors: "作者"
    year: 2024
    kind: paper | specification | documentation | article | repository
lab: kv-budget
verifiedAt: 2026-10-18
related: ["llm-agent/frontier/kv-cache-budget"]
```

- Every flagship note cites at least three primary sources; experiment notes cite
  at least two.
- A lab slug must exist in `apps/web/src/lib/labs.ts`; content cannot load scripts.
- Simulations must say they are simulations. Never present a local model as a
  hardware measurement.
- Keep existing slugs when revising old notes. Add `question`, `conclusion`,
  `takeaways`, `evidence`, and `verifiedAt` when upgrading a legacy note.
