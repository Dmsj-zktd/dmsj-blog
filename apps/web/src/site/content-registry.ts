/**
 * 内容模块注册表：新增一个内容域的唯一入口。
 *
 * 新增域步骤：
 * 1. 在 `content/<key>/` 下新建 Markdown/MDX；
 * 2. 在本文件追加一条 `ContentModule`；
 * 3. 首页导航、域列表、目录/标签聚合、sitemap、RSS、搜索自动派生。
 */
export type DomainKey = "algorithms" | "embedded" | "llm-agent" | "projects" | "thoughts";

export interface ContentModule {
  /** 目录名，必须与 content/<key> 一致 */
  key: DomainKey | (string & {});
  label: string;
  shortLabel: string;
  description: string;
  /** 首页展示顺序 */
  order: number;
  /** 是否出现在主导航 */
  inNav: boolean;
  /** 是否计入 RSS / sitemap / 搜索 */
  public: boolean;
}

export const contentModules: ContentModule[] = [
  {
    key: "algorithms",
    label: "算法心得",
    shortLabel: "算法",
    description: "数据结构、复杂度与算法题的工程化理解，重推导与可复现。",
    order: 1,
    inNav: true,
    public: true,
  },
  {
    key: "embedded",
    label: "嵌入式经验",
    shortLabel: "嵌入式",
    description: "MCU/RTOS/驱动/边缘 AI 的底层实践经验，含踩坑与验证方法。",
    order: 2,
    inNav: true,
    public: true,
  },
  {
    key: "llm-agent",
    label: "LLM / Agent 经验",
    shortLabel: "LLM/Agent",
    description: "模型推理、工具调用、Agent 架构与评测的工程记录。",
    order: 3,
    inNav: true,
    public: true,
  },
  {
    key: "projects",
    label: "项目展示",
    shortLabel: "项目",
    description: "把做过的东西讲清楚：目标、权衡、实现与可复现结果。",
    order: 4,
    inNav: true,
    public: true,
  },
  {
    key: "thoughts",
    label: "随想杂谈",
    shortLabel: "随想",
    description: "方法论与工程思考，短一些、真诚一些。",
    order: 5,
    inNav: true,
    public: true,
  },
];

export function getModule(key: string): ContentModule | undefined {
  return contentModules.find((m) => m.key === key);
}

/** 目录名 -> 展示名；未登记的路径段回退为可读化 slug。 */
export const categoryLabels: Record<string, string> = {
  dp: "动态规划",
  "binary-search": "二分搜索",
  rtos: "RTOS",
  drivers: "驱动开发",
  agents: "Agent 架构",
  inference: "推理优化",
  "interview-prep": "面试准备",
  mcu: "MCU 开发",
  linux: "Linux 底层",
};

export function humanizeCategorySegment(segment: string): string {
  if (categoryLabels[segment]) return categoryLabels[segment];
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
