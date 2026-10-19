import type { LabResult } from "@/lib/labs";

const round = (value: number, digits = 2) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

export default function evaluate(values: Record<string, number>): LabResult {
  const total = values.totalParams;
  const activeFraction = values.activeExperts / values.totalExperts;
  const residentFraction = Math.min(1, values.cacheSlots / values.totalExperts);
  const routingSkew = values.skew / 100;
  const tailFactor = 1 + routingSkew * 1.8;

  return {
    verdict:
      activeFraction < 0.25 && routingSkew > 0.5
        ? "计算看似稀疏，但热点专家和缓存 miss 可能制造明显尾延迟。"
        : "稀疏激活带来的计算收益仍取决于专家放置、批大小与路由分布。",
    metrics: [
      {
        id: "activeParams",
        label: "等效激活参数",
        value: round(total * activeFraction, 2),
        unit: "B",
        detail: "总参数 × 激活专家比例",
        tone: "ai",
      },
      {
        id: "resident",
        label: "专家常驻比例",
        value: round(residentFraction, 3),
        unit: "",
        detail: "缓存槽 ÷ 专家总数",
        tone: "embedded",
      },
      {
        id: "tail",
        label: "尾延迟放大",
        value: round(tailFactor, 2),
        unit: "×",
        detail: "路由越偏斜，热点专家越集中",
        tone: "neutral",
      },
    ],
  };
}
