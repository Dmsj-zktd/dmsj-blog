/**
 * 中文字案资源。新增语言时复制该文件并保持 key 完整；
 * 禁止在组件中散落未登记文案。
 */
export const ui = {
  nav: {
    home: "首页",
    archive: "归档",
    tags: "标签",
    search: "搜索",
    about: "关于",
    admin: "管理",
    skipToContent: "跳到正文",
  },
  home: {
    heroEyebrow: "Personal technical journal",
    recent: "最近更新",
    byDomain: "按内容域浏览",
    viewAll: "查看全部",
    noPosts: "暂无文章",
    readMore: "阅读全文",
  },
  post: {
    published: "发布于",
    updated: "更新于",
    readingTime: "阅读",
    minutes: "分钟",
    tags: "标签",
    series: "系列",
    category: "分类",
    backToList: "返回列表",
    previous: "上一篇",
    next: "下一篇",
    backToTop: "回到顶部",
    copyCode: "复制代码",
    copied: "已复制",
    toc: "目录",
    comments: "评论",
  },
  archive: {
    title: "归档",
    byYear: "按年份归档",
    total: "共 {total} 篇",
  },
  tags: {
    title: "标签",
    posts: "篇",
    empty: "暂无标签",
  },
  search: {
    title: "搜索",
    placeholder: "输入关键词，支持中文与代码符号",
    empty: "没有匹配结果",
    loading: "正在加载索引…",
    initial: "输入至少 1 个字符开始搜索",
    resultCount: "找到 {count} 条结果",
  },
  about: {
    title: "关于",
  },
  domain: {
    empty: "该内容域还没有公开文章",
    allPosts: "全部文章",
  },
  footer: {
    codeLicense: "代码：MIT",
    contentLicense: "内容：CC BY-NC-SA 4.0",
    builtWith: "Built with Astro · Cloudflare",
    rss: "RSS",
  },
  notFound: {
    title: "页面不存在",
    description: "你访问的地址不存在或已被移动。",
    backHome: "回到首页",
  },
  theme: {
    label: "切换主题",
    auto: "随机/自动",
    picker: "主题",
    mode: "深浅色",
  },
  admin: {
    login: "登录管理后台",
    logout: "退出登录",
  },
} as const;

export type UiText = typeof ui;
export type I18nKey = keyof UiText;
