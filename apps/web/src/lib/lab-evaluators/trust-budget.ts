import type { LabResult } from "@/lib/labs";

const round = (value: number, digits = 2) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

export default function evaluate(values: Record<string, number>): LabResult {
  const cycles = (values.signCycles + values.verifyCycles) * values.iterations;
  const latencyMs = cycles / (values.clockMHz * 1000);
  const margin = values.deadlineMs - latencyMs;
  const keyBytes = values.keyBytes * values.iterations;

  return {
    verdict:
      margin < 0
        ? "当前安全操作超出截止期；需要硬件加速、缓存/批处理或缩短信任链。"
        : "当前预算仍留有截止期余量；还要检查最坏执行时间与功耗状态切换。",
    metrics: [
      {
        id: "latency",
        label: "密码学延迟",
        value: round(latencyMs, 3),
        unit: "ms",
        detail: "签名 + 验证周期 × 次数 ÷ 时钟",
        tone: "embedded",
      },
      {
        id: "margin",
        label: "截止期余量",
        value: round(margin, 3),
        unit: "ms",
        detail: "截止期 - 密码学延迟",
        tone: "ai",
      },
      {
        id: "keyBytes",
        label: "密钥/签名流量",
        value: round(keyBytes, 0),
        unit: "B",
        detail: "每周期操作 × 密钥与签名大小",
        tone: "neutral",
      },
    ],
  };
}
