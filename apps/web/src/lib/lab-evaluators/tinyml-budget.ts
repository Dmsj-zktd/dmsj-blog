import type { LabResult } from "@/lib/labs";

const round = (value: number, digits = 2) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

export default function evaluate(values: Record<string, number>): LabResult {
  const params = values.params * 1e6;
  const bits = values.bits;
  const weightKB = (params * bits) / 8 / 1024;
  const activationKB = values.activationKB;
  const kvKB = values.kvKB;
  const overhead = values.overhead / 100;
  const usableKB = values.sramKB / (1 + overhead);
  const totalKB = weightKB + activationKB + kvKB;

  return {
    verdict:
      totalKB <= usableKB
        ? "在给定预算内可以容纳；仍需检查对齐、栈和峰值并发访存。"
        : `当前配置超出 SRAM 约 ${round(totalKB - usableKB, 1)} KiB；需要更低量化、更小 KV 或外部存储。`,
    metrics: [
      {
        id: "weightKB",
        label: "权重存储",
        value: round(weightKB, 1),
        unit: "KiB",
        detail: "参数量 × 位宽 ÷ 8",
        tone: "ai",
      },
      {
        id: "totalKB",
        label: "总占用",
        value: round(totalKB, 1),
        unit: "KiB",
        detail: "权重 + 激活 + KV",
        tone: "embedded",
      },
      {
        id: "fit",
        label: "可用 SRAM",
        value: round(usableKB, 1),
        unit: "KiB",
        detail: "已扣除运行时余量",
        tone: "neutral",
      },
    ],
  };
}
