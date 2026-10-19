import type { LabResult } from "@/lib/labs";

const round = (value: number, digits = 2) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

export default function evaluate(values: Record<string, number>): LabResult {
  const attempts = values.attempts;
  const successRate = values.successRate;
  const verifier = values.verifierAccuracy;
  const cost = values.costPerAttempt;
  const bestOfN = 1 - (1 - successRate) ** attempts;
  const verified = bestOfN * verifier;

  return {
    verdict:
      verifier < 0.8
        ? "验证器质量正在主导收益；增加采样前先提高可验证性。"
        : verified > 0.75
          ? "在当前假设下，推理预算可能比直接扩大模型更划算。"
          : "预算已较高但可靠率仍有限，检查样本相关性与题目难度分布。",
    metrics: [
      {
        id: "bestOfN",
        label: "至少一次正确",
        value: round(bestOfN, 4),
        unit: "",
        detail: "独立同分布下的理论上限",
        tone: "ai",
      },
      {
        id: "verified",
        label: "验证后可靠率",
        value: round(verified, 4),
        unit: "",
        detail: "上限 × 验证器精度",
        tone: "embedded",
      },
      {
        id: "budget",
        label: "推理预算",
        value: round(attempts * cost, 2),
        unit: "cost",
        detail: "采样次数 × 单次成本",
        tone: "neutral",
      },
    ],
  };
}
