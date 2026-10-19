import type { LabResult } from "@/lib/labs";

const round = (value: number, digits = 2) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

export default function evaluate(values: Record<string, number>): LabResult {
  const steps = values.steps;
  const successRate = values.successRate;
  const retries = values.retries;
  const idempotency = values.idempotency / 100;
  const chain = successRate ** steps;
  const attemptedCalls = steps * (1 + retries * (1 - successRate));
  const duplicateRisk = (1 - idempotency) * (1 - successRate) * retries;

  return {
    verdict:
      chain < 0.8
        ? "端到端成功率低于工程上常见的可接受范围；增加每步观测和可恢复检查点。"
        : duplicateRisk > 0.02
          ? "重复副作用风险偏高；写操作应携带幂等键并记录执行结果。"
          : "循环在给定假设内可控，但仍需总超时和最大步数。",
    metrics: [
      {
        id: "chainSuccess",
        label: "链路成功率",
        value: round(chain, 4),
        unit: "",
        detail: "假设各步独立",
        tone: "ai",
      },
      {
        id: "calls",
        label: "预期工具调用",
        value: round(attemptedCalls, 2),
        unit: "calls",
        detail: "包含失败后的重试",
        tone: "embedded",
      },
      {
        id: "duplicateRisk",
        label: "重复副作用暴露",
        value: round(duplicateRisk, 4),
        unit: "",
        detail: "未幂等写操作 × 重试机会",
        tone: "neutral",
      },
    ],
  };
}
