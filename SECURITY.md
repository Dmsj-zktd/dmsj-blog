# 安全说明

## 报告安全问题

本仓库是公开个人技术博客源码。如果你发现安全漏洞（XSS、认证绕过、信息泄露、依赖漏洞等），
请先私信 GitHub 仓库所有者，不要创建公开 issue，避免漏洞被利用。

请提供：

- 影响范围与可复现步骤；
- 期望行为与实际行为；
- 环境信息（浏览器/系统/版本）；
- 如涉及 payload，请最小化并脱敏。

## 项目自身的安全基线

- Secrets 只存在于 gitignore 的 `.dev.vars` / Cloudflare Secrets，禁止提交；
- 后台仅允许 GitHub 白名单账号经 OAuth 登录；OAuth state 与短时 HttpOnly Cookie 绑定；
- 仅显式 `ENVIRONMENT=development` 允许本地回退；其他环境必须设置
  `ALLOWED_GITHUB_LOGIN`、`IP_SALT`、`SESSION_SECRET`，缺失时管理功能 fail-closed；
- 会话 Cookie 使用 `__Host-` 前缀，GitHub token 使用 AES-GCM 加密后写入 KV；
- 所有管理写操作要求会话级 CSRF token 与同源 Origin，并写入成功/失败审计；
- 登录发起按客户端 IP 限流；OAuth state 单次使用并与短时 HttpOnly Cookie 绑定；
- API 输入全部经过 Zod 校验，SQL 参数化，内容路径限制在注册域与 `content/` 目录；
- 公共页面输出严格 CSP 与安全响应头；搜索结果只接受 Pagefind 的 `<mark>` 标记；
- 依赖通过 Dependabot、CodeQL、Secret Scan、生产依赖审计与锁文件校验跟踪；合并前必须通过 CI。
- 三轮差异审查记录位于 `docs/reviews/`：认证与数据、供应链与 XSS、浏览器与无障碍；每轮使用不同视角，未进行无 diff 的重复审查。

## 威胁模型摘要

- 不可信输入：文章草稿、GitHub OAuth 回调、搜索词、统计查询、CSV 导出、User-Agent。
- 信任边界：浏览器 ↔ Cloudflare Pages Functions ↔ GitHub Contents API / D1 / KV。
- 关键资产：GitHub token、会话、管理员身份、已发布正文、审计记录、访客 IP 哈希。
- 主要风险：提示注入型后台内容、路径穿越覆盖仓库、CSRF、会话窃取、搜索 XSS、CSV 公式注入、
  D1 读写错误、供应链依赖与生产配置漂移。
- 明确不在本期范围：多角色权限、TOTP、媒体上传、Webmention、PWA 离线、生产环境的硬件攻击。
