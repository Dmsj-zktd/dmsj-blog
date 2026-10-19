import type { LabResult } from "@/lib/labs";

const round = (value: number, digits = 2) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

export default function evaluate(values: Record<string, number>): LabResult {
  const peak = values.peakTFLOPS;
  const bandwidth = values.bandwidthGBs;
  const intensity = values.intensity;
  const utilization = values.utilization / 100;
  const modelMB = values.modelMB;
  const roof = (peak * 1e12) / (bandwidth * 1e9);
  const effectiveOps = modelMB * 2 ** 20 * intensity;
  const computeTime = (effectiveOps / (peak * 1e12 * utilization)) * 1000;
  const memoryTime = ((modelMB * 2 ** 20) / (bandwidth * 1e9)) * 1000;

  return {
    verdict:
      intensity < roof
        ? "数据移动是主约束；向量算子与 NPU 需要共享的高复用数据流。"
        : "算力可能成为主约束；算子融合、流水线和工具链成熟度更关键。",
    metrics: [
      {
        id: "roofline",
        label: "带宽拐点",
        value: round(roof, 2),
        unit: "ops/B",
        detail: "峰值算力 ÷ 有效带宽",
        tone: "ai",
      },
      {
        id: "computeTime",
        label: "计算侧时间",
        value: round(computeTime, 4),
        unit: "ms",
        detail: "工作集 × 算术强度 ÷ 有效算力",
        tone: "embedded",
      },
      {
        id: "memoryTime",
        label: "内存侧时间",
        value: round(memoryTime, 4),
        unit: "ms",
        detail: "工作集字节 ÷ 有效带宽",
        tone: "neutral",
      },
    ],
  };
}
