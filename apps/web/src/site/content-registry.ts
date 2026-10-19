import {
  type ContentDomain,
  contentDomains,
  type DomainKey,
  isDomainKey,
} from "@dmsj/content-model";

export type ContentModule = ContentDomain;
export type { DomainKey };
export { isDomainKey };

export const contentModules: ContentModule[] = contentDomains.map((domain) => ({ ...domain }));

export function getModule(key: string): ContentModule | undefined {
  return contentModules.find((module) => module.key === key);
}

export const categoryLabels: Record<string, string> = {
  dp: "动态规划",
  "binary-search": "二分查找",
  rtos: "实时调度",
  drivers: "驱动开发",
  agents: "Agent 系统",
  inference: "推理优化",
  "interview-prep": "面试准备",
  mcu: "微控制器",
  linux: "Linux 内核",
  frontier: "前沿研究",
  "paged-kv-cache": "分页 KV Cache",
  "flash-attention": "FlashAttention",
  "test-time-compute": "推理时计算",
  "agent-protocols": "Agent 协议",
  "sparse-moe": "稀疏 MoE",
  "on-device-models": "端侧模型",
  "riscv-ai-acceleration": "RISC-V AI",
  "chiplet-edge-soc": "Chiplet SoC",
  "compute-in-memory": "存算一体",
  "embedded-trust": "嵌入式信任",
};

export function humanizeCategorySegment(segment: string): string {
  if (categoryLabels[segment]) return categoryLabels[segment];
  return segment
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
