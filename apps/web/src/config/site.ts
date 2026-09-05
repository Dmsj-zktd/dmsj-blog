export interface SiteConfig {
  name: string;
  shortName: string;
  tagline: string;
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
  defaultTheme: "random" | (string & {});
}

/**
 * 上线前待替换：把 url/owner/repo/author 换成真实信息。
 * 这里的内容会进入 HTML head、RSS、sitemap 与 JSON-LD。
 */
export const site: SiteConfig = {
  name: "DMSJ · 工程技术笔记",
  shortName: "DMSJ",
  tagline: "万物皆可 Turing，万物皆可 Hack。",
  description: "万物皆可 Turing，万物皆可 Hack。",
  url: "https://dmsj-blog.pages.dev",
  locale: "zh-CN",
  author: {
    name: "DMSJ",
    login: "Dmsj-zktd",
    email: "you@example.com",
    bio: "喜欢千奇百怪 – 总是啥都关注的 边缘开发者  ^~^",
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
    owner: "your-github-login",
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
  defaultTheme: "random",
};
