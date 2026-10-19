import type { AudienceLens } from "@dmsj/content-model";

export interface AudienceDefinition {
  id: AudienceLens;
  label: string;
  shortLabel: string;
  eyebrow: string;
  headline: string;
  description: string;
  primaryLabel: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
}

export const audienceDefinitions: AudienceDefinition[] = [
  {
    id: "builder",
    label: "技术同行",
    shortLabel: "工程",
    eyebrow: "For builders",
    headline: "从内存层级到截止期，把 AI 与嵌入式放进同一张工程图。",
    description:
      "直接进入论文拆解、可运行实验和失败边界。这里不展示“会用工具”，而是展示为什么一个系统会快、会慢、会在哪里失效。",
    primaryLabel: "浏览前沿研究",
    primaryHref: "/frontier/",
    secondaryLabel: "打开实验台",
    secondaryHref: "/lab/",
  },
  {
    id: "hiring",
    label: "招聘评审",
    shortLabel: "评审",
    eyebrow: "For hiring",
    headline: "用可验证的工程证据，而不是技能关键词介绍能力。",
    description:
      "从架构决策、性能预算、安全审查与可复现实验快速判断：这个人如何拆问题、做取舍并把系统真正交付。",
    primaryLabel: "查看能力档案",
    primaryHref: "/about/",
    secondaryLabel: "阅读工程案例",
    secondaryHref: "/projects/",
  },
  {
    id: "explorer",
    label: "兴趣探索",
    shortLabel: "探索",
    eyebrow: "For explorers",
    headline: "从一个问题出发，把复杂的 AI 与硬件系统读明白。",
    description:
      "无需先掌握所有术语。先看核心问题、直觉图解和结论，再按自己的兴趣进入论文、代码或更深的系统细节。",
    primaryLabel: "从研究雷达开始",
    primaryHref: "/frontier/",
    secondaryLabel: "阅读推荐路径",
    secondaryHref: "/archive/",
  },
];

export function getAudience(id: AudienceLens): AudienceDefinition {
  return audienceDefinitions.find((audience) => audience.id === id) ?? audienceDefinitions[0];
}
