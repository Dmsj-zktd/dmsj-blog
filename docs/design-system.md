# 设计系统与参考（Design System & References）

## 原则

- 内容优先：无玻璃拟态、无彩虹渐变、无装饰性动效；动效只服务于状态反馈。
- 克制用色：任何页面主色不超过一个强调色，其余靠层级（纸面、墨色、发丝线）表达。
- 排印即品牌：五种主题差异主要在字体气质与色温，而非布局。
- 可读性：正文行高 ≥ 1.7，阅读栏宽约 46rem，中英文混排走系统字体栈。
- 无障碍：焦点可见、语义化结构、`prefers-reduced-motion`、AA 对比。

## 借鉴对象与提炼点

| 对象 | 提炼 |
| --- | --- |
| Overreacted | 超高可读性的纸面对比、链接强调色克制 |
| Brandur / 编辑式博客 | 衬线标题 + 阅读留白 + 单一强调色 |
| Tonsky / Ciechanowski | 技术内容的排版纪律、图表与代码细节 |
| Julia Evans | 温暖、可亲近的工程叙述语气 |
| Antfu | “少即是多”的工艺感与留白控制 |

## 主题 token 语义

所有主题通过以下 CSS 变量驱动，组件禁止写死颜色：

`--bg`、`--bg-elev`、`--fg`、`--fg-soft`、`--fg-faint`、`--accent`、
`--accent-soft`、`--hairline`、`--selection`、`--code-bg`、`--code-fg`、`--kbd-bg`。

主题列表在 `apps/web/src/site/themes.ts`；色值实现见 `apps/web/src/styles/global.css`。

## 交互规则

- 主题：访客自选持久化到 localStorage；未配置时每次访问随机；`?theme=` 可预览。
- 代码块：复制按钮仅在 hover/focus 显示；语法高亮由 Shiki 在构建期生成。
- 搜索：Pagefind 构建期中文索引，前端无搜索服务器依赖。

## 素材来源结论

- 图标：系统内联 SVG，不引入图标字体；
- 图片：无外部图片站依赖，示例内容以代码/表格/公式承载信息；
- 字体：Latin 使用本地 Fontsource Inter Variable；CJK 使用系统字体栈；
- 图表：前台不使用图表库；后台统计用 SVG 轻量可视化。
