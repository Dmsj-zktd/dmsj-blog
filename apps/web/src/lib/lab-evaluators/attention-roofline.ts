import type { LabResult } from "@/lib/labs";

const round = (value: number, digits = 2) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

export default function evaluate(values: Record<string, number>): LabResult {
  const sequence = values.sequence;
  const heads = values.heads;
  const headDim = values.headDim;
  const peak = values.peakTFLOPS;
  const bandwidth = values.bandwidthGBs;
  const bytes = values.bytes;
  const flops = 4 * sequence ** 2 * heads * headDim;
  const memoryBytes = 4 * sequence * heads * headDim * bytes;
  const intensity = flops / memoryBytes;
  const roof = (peak * 1e12) / (bandwidth * 1e9);

  return {
    verdict:
      intensity < roof
        ? "工作点位于带宽侧；继续堆算力收益有限，应优先减少 HBM 往返。"
        : "工作点更接近计算侧；分块、低精度与并行调度会决定峰值能否兑现。",
    metrics: [
      {
        id: "intensity",
        label: "算术强度",
        value: round(intensity, 2),
        unit: "FLOP/B",
        detail: "粗略注意力 FLOPs ÷ 估算的 HBM 字节",
        tone: "ai",
      },
      {
        id: "roofline",
        label: "Roofline 拐点",
        value: round(roof, 2),
        unit: "FLOP/B",
        detail: "峰值算力 ÷ 峰值带宽",
        tone: "embedded",
      },
      {
        id: "memoryMB",
        label: "估算 HBM 往返",
        value: round(memoryBytes / 2 ** 20, 2),
        unit: "MiB",
        detail: "朴素路径的单次量级估算",
        tone: "neutral",
      },
    ],
  };
}
