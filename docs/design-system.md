# DMSJ Signal Lab 设计系统

## 视觉主张

一套语言，两种密度：

- **Signal Lab**：发现、主题入口、研究雷达与研究图谱，使用 12 栏非对称网格、标尺线、真实的文章关系和少量技术图形。
- **Research Journal**：长文阅读，降低装饰密度，保持约 70ch 的正文宽度、清晰来源栏、公式、代码和实验的稳定节奏。

颜色只表达语义，不做随机换肤：

- 蓝 `--ai`：推理、Agent、数据与可交互状态。
- 暖橙 `--embedded`：硅、嵌入式、风险与约束的图形填充；小号文字使用加深后的
  `--embedded-text`，同时保留品牌色和 WCAG AA 对比度。
- `--paper` / `--ink` / `--line`：纸面、墨色和结构线。
- `--success` / `--warning` / `--danger`：系统反馈。

完整 token 位于 `apps/web/src/styles/global.css`。组件不得写死主题色。

## 字体

- UI 与标题：Instrument Sans Variable。
- Research Journal 西文正文：Newsreader Variable。
- 中文：PingFang SC / Hiragino Sans GB / Noto Sans CJK SC / Microsoft YaHei 系统栈。
- 代码与元数据：系统等宽字体，避免额外字体下载。

## 交互

- 页面转场：原生跨文档 View Transition；不支持时普通导航。
- 动效只用于章节状态、实验反馈、目录、复制与菜单，时长 120–360ms。
- 不使用 WebGL、滚动劫持、随机整页入场、鼠标光晕或常驻粒子。
- 实验先服务端输出静态结果，再由轻量脚本按需更新；关闭 JS 仍能读到结论。
- 所有控件至少 44px 触控面积，焦点可见，支持减少动态、强制颜色与 200% 缩放。

## 页面组件

- `SignalMap`：由前沿主题注册表生成，桌面为关系图，窄屏降级为可访问列表。
- `AudienceSwitch`：技术同行 / 招聘评审 / 兴趣探索；只调整文案与推荐路径，不隐藏内容。
- `EvidenceCard`：成熟度、证据等级、核查日期、局限和配套实验。
- `ArticleCard`：内容域、文章类型、日期、阅读时间、证据状态和标题。
- `LabExplorer`：参数化软件模型，默认结论、实时指标、假设和证据边界同时可见。
- 研究雷达：评分字段公开，编辑权重与来源可追溯。

## 内容与证据

- 每篇研究笔记必须声明 `kind`、`topic`、`maturity`、`sources`、`evidence` 和 `verifiedAt`。
- “论文报告”“本地模拟”“分析推演”不得混写。
- 文章正文、目录、来源和静态实验结论必须不依赖 JavaScript 可读。
- 站内引用使用论文、官方规范、文档或仓库；外部链接由独立定时任务检查，不阻塞构建。

## 可复用素材与技能

- [参考账本](design/reference-ledger.md)：记录 25 个设计平台和作品的借鉴原则、风险与边界，不复制素材。
- [第三方技能锁](design/vendor-lock.md)：记录本地指令快照的来源、commit、许可证与校验值。
- `.agents/skills/dmsj-signal-lab`：项目级设计约束与视觉审查流程。
- `.agents/skills/frontend-design`：Anthropic 的视觉方向与反模板化设计方法。
- `.agents/skills/web-design-guidelines`：Vercel Web Interface Guidelines 的固定本地快照。

## 质量基线

- WCAG 2.2 AA；axe 无 serious/critical。
- 320–2560px 无横向溢出。
- 首页首屏 JS ≤ 60KB gzip，文章页 ≤ 35KB；CSS ≤ 50KB gzip。
- 移动端 LCP ≤ 2.5s、CLS ≤ 0.05、INP ≤ 200ms，Lighthouse 四项 ≥ 95（目标值）。
- Chromium、Firefox、WebKit 自动回归，关键页面保存 390 / 768 / 1440 视觉基线。
