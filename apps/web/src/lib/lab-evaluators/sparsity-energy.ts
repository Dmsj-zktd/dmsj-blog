import type { LabResult } from "@/lib/labs";

const round = (value: number, digits = 2) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

export default function evaluate(values: Record<string, number>): LabResult {
  const denseOps = values.denseOps;
  const sparsity = values.sparsity / 100;
  const cimEfficiency = values.cimEfficiency;
  const overhead = values.eventOverhead / 100;
  const effectiveOps = denseOps * (1 - sparsity);
  const effectiveThroughput = effectiveOps * cimEfficiency * (1 - overhead);
  const energyPJ = (denseOps / Math.max(0.01, effectiveThroughput)) * 3.3;

  return {
    verdict:
      overhead > 0.3
        ? "稀疏控制开销正在吞噬计算节省；需要先优化数据布局和事件路由。"
        : "在该模型下，稀疏和 CIM 的组合仍有明显理论收益，需用真实负载验证。",
    metrics: [
      {
        id: "effectiveOps",
        label: "有效运算",
        value: round(effectiveOps, 2),
        unit: "GOP",
        detail: "稠密运算 × (1 - 稀疏度)",
        tone: "ai",
      },
      {
        id: "throughput",
        label: "有效吞吐比",
        value: round(effectiveThroughput, 2),
        unit: "×",
        detail: "CIM 收益 × 事件开销后的相对值",
        tone: "embedded",
      },
      {
        id: "energy",
        label: "近似能耗指数",
        value: round(energyPJ, 2),
        unit: "pJ",
        detail: "用于比较配置，不是器件实测",
        tone: "neutral",
      },
    ],
  };
}
