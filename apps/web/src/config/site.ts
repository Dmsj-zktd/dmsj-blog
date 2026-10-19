export interface SiteConfig {
  name: string;
  shortName: string;
  /** 固定品牌主张；页面不再随机替换，以保证文案与视觉稳定 */
  tagline: string;
  /** 可复用的短句素材，不参与运行时随机展示 */
  taglines: string[];
  description: string;
  url: string;
  locale: string;
  author: {
    name: string;
    login: string;
    email: string;
    bio: string;
    social: Array<{ id: "github" | "gitee"; label: string; url: string }>;
  };
  repo: {
    owner: string;
    repo: string;
    branch: string;
  };
  license: {
    code: string;
    content: string;
  };
  giscus: {
    enabled: boolean;
    repo: string;
    repoId: string;
    category: string;
    categoryId: string;
    mapping: "pathname";
    strict: boolean;
    lang: string;
  };
  pages: {
    nav: Array<{ label: string; href: string; order: number }>;
  };
  analytics: {
    endpoint: string;
    excludeBots: boolean;
  };
  defaultTheme: "auto" | "light" | "dark";
}

/**
 * 上线前待替换：把 url/owner/repo/author 换成真实信息。
 * 这里的内容会进入 HTML head、RSS、sitemap 与 JSON-LD。
 */
export const site: SiteConfig = {
  name: "DMSJ · Signal Lab",
  shortName: "DMSJ",
  tagline: "在硅与推理之间，构建可验证的系统。",
  taglines: [
    "在硅与推理之间，构建可验证的系统。",
    "把论文变成可以跑的模型、可以被推翻的结论。",
    "从 HBM 到 MCU，追问同一条内存层级。",
  ],
  description: "AI 系统、Agent 可靠性与嵌入式工程的研究型技术博客。",
  url: "https://dmsj-blog.pages.dev",
  locale: "zh-CN",
  author: {
    name: "DMSJ",
    login: "Dmsj-zktd",
    email: "",
    bio: "关注 AI 系统与嵌入式边缘计算，习惯从底层约束反推上层设计。",
    social: [
      {
        id: "github",
        label: "GitHub",
        url: "https://github.com/Dmsj-zktd",
      },
      {
        id: "gitee",
        label: "Gitee",
        url: "https://gitee.com/zky_dmsj",
      },
    ],
  },
  repo: {
    owner: "Dmsj-zktd",
    repo: "dmsj-blog",
    branch: "main",
  },
  license: {
    code: "MIT",
    content: "CC BY-NC-SA 4.0",
  },
  giscus: {
    enabled: false,
    repo: "",
    repoId: "",
    category: "Announcements",
    categoryId: "",
    mapping: "pathname",
    strict: false,
    lang: "zh-CN",
  },
  pages: {
    nav: [
      { label: "首页", href: "/", order: 0 },
      { label: "归档", href: "/archive", order: 4 },
      { label: "标签", href: "/tags", order: 5 },
      { label: "搜索", href: "/search", order: 6 },
      { label: "关于", href: "/about", order: 7 },
    ],
  },
  analytics: {
    endpoint: "/api/track",
    excludeBots: true,
  },
  defaultTheme: "auto",
};
