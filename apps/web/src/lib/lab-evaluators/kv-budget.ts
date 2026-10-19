import type { LabResult } from "@/lib/labs";

const round = (value: number, digits = 2) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

export default function evaluate(values: Record<string, number>): LabResult {
  const layers = values.layers;
  const kvHeads = values.kvHeads;
  const headDim = values.headDim;
  const sequence = values.sequence;
  const concurrency = values.concurrency;
  const bytes = values.bytes;
  const bytesPerToken = layers * kvHeads * headDim * 2 * bytes;
  const totalGiB = (bytesPerToken * sequence * concurrency) / 2 ** 30;
  const tokensPerMiB = 2 ** 20 / bytesPerToken;

  return {
    verdict:
      totalGiB > 40
        ? "容量已经成为主瓶颈；优先降低并发、提高 GQA 比例或启用分页/驱逐。"
        : "缓存仍可容纳，但延迟会随并发和块分配碎片上升；继续观察尾延迟。",
    metrics: [
      {
        id: "bytesPerToken",
        label: "每 token 缓存",
        value: round(bytesPerToken, 0),
        unit: "B",
        detail: "layers × KV heads × head_dim × 2 × bytes",
        tone: "ai",
      },
      {
        id: "totalGiB",
        label: "总缓存",
        value: round(totalGiB, 2),
        unit: "GiB",
        detail: "不含权重、激活与 allocator 余量",
        tone: "embedded",
      },
      {
        id: "tokensPerMiB",
        label: "每 MiB 可存 token",
        value: round(tokensPerMiB, 1),
        unit: "tokens",
        detail: "单序列容量，不含碎片",
        tone: "neutral",
      },
    ],
  };
}
