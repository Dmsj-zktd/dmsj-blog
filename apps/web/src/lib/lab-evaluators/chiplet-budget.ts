import type { LabResult } from "@/lib/labs";

const round = (value: number, digits = 2) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

export default function evaluate(values: Record<string, number>): LabResult {
  const bytes = values.tokens * values.bytesPerTokenMB * 2 ** 20;
  const transferMs = (bytes / (values.bandwidthGBs * 1e9)) * 1000;
  const energyMJ = (bytes * values.energyPJByte) / 1e9;
  const powerLimitMs = energyMJ / Math.max(0.01, values.powerW);

  return {
    verdict:
      transferMs > 3
        ? "互连传输时间过大；应先减少跨 die 数据量与 token 级同步。"
        : "在当前假设下互连可接受，但能耗和封装良率仍需纳入总成本。",
    metrics: [
      {
        id: "transferMs",
        label: "跨 die 传输",
        value: round(transferMs, 3),
        unit: "ms",
        detail: "批内 token × 每 token 字节 ÷ 带宽",
        tone: "ai",
      },
      {
        id: "energyMJ",
        label: "互连能耗",
        value: round(energyMJ, 4),
        unit: "mJ",
        detail: "字节 × pJ/B",
        tone: "embedded",
      },
      {
        id: "powerMs",
        label: "功耗预算时间",
        value: round(powerLimitMs, 3),
        unit: "ms",
        detail: "互连能耗 ÷ 功耗预算",
        tone: "neutral",
      },
    ],
  };
}
