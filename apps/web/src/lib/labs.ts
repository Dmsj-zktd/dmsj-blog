import { getFrontierTopic, type SourceRef } from "@dmsj/content-model";

export interface LabField {
  id: string;
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit?: string;
}

export interface LabMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  detail: string;
  tone?: "ai" | "embedded" | "neutral";
}

export interface LabResult {
  verdict: string;
  metrics: LabMetric[];
}

export interface LabDefinition {
  slug: string;
  topic: string;
  title: string;
  shortTitle: string;
  description: string;
  question: string;
  evidence: string;
  staticConclusion: string;
  fields: LabField[];
  sources: SourceRef[];
}

const round = (value: number, digits = 2) => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

const field = (
  id: string,
  label: string,
  value: number,
  min: number,
  max: number,
  step: number,
  hint: string,
  unit?: string,
): LabField => ({ id, label, value, min, max, step, hint, unit });

const topicSources = (topicId: string): SourceRef[] =>
  (getFrontierTopic(topicId)?.sources ?? []).slice(0, 3);

export const labDefinitions: LabDefinition[] = [
  {
    slug: "kv-budget",
    topic: "paged-kv-cache",
    title: "KV Cache 容量与分页预算",
    shortTitle: "KV 容量账本",
    description:
      "改变层数、KV heads、上下文和并发数，观察显存从“每 token 字节”增长为整机容量约束。",
    question: "在给定显存预算下，长上下文和并发量哪个更快压垮服务？",
    evidence: "软件预算模型；不代表特定 GPU 或推理框架的实测吞吐。",
    staticConclusion:
      "按默认参数，每个 token 的 KV Cache 为 128 KiB；16 路并发、8K 上下文需要约 16 GiB，仅缓存本身就已经接近一张大显存加速卡。",
    fields: [
      field("layers", "Transformer 层数", 32, 8, 120, 1, "每层都保存自己的 K/V"),
      field("kvHeads", "KV heads", 8, 1, 64, 1, "GQA/MQA 会显著降低该值"),
      field("headDim", "Head dimension", 128, 32, 256, 16, "单个注意力头的宽度"),
      field(
        "sequence",
        "上下文长度",
        8192,
        512,
        131072,
        512,
        "每个请求需要保存的 token 数",
        "tokens",
      ),
      field("concurrency", "并发请求", 16, 1, 256, 1, "连续批处理中的活跃序列数"),
      field("bytes", "每元素字节", 2, 1, 4, 1, "FP16/BF16 为 2，FP32 为 4"),
    ],
    sources: topicSources("paged-kv-cache"),
  },
  {
    slug: "attention-roofline",
    topic: "hardware-aware-attention",
    title: "注意力 IO 与 Roofline",
    shortTitle: "Attention Roofline",
    description: "用序列长度、头数和加速器带宽估算注意力是计算受限还是显存带宽受限。",
    question: "为什么把同一组数学运算分块后，端到端速度会改变？",
    evidence: "量级估算模型；忽略 cache line、bank conflict 与 kernel launch 开销。",
    staticConclusion:
      "长序列注意力的算术强度随序列长度上升，但朴素实现仍会产生大量 HBM 往返；FlashAttention 的关键是把可复用块留在片上 SRAM。",
    fields: [
      field("sequence", "序列长度", 4096, 256, 32768, 256, "单序列 token 数", "tokens"),
      field("heads", "注意力头数", 32, 4, 128, 4, "每层头数"),
      field("headDim", "Head dimension", 128, 32, 256, 16, "K/Q/V 的宽度"),
      field("peakTFLOPS", "峰值算力", 60, 1, 2000, 1, "用于估算的芯片峰值", "TFLOPS"),
      field("bandwidthGBs", "HBM 带宽", 900, 20, 8000, 20, "数据往返的峰值带宽", "GB/s"),
      field("bytes", "元素字节", 2, 1, 4, 1, "FP16 为 2"),
    ],
    sources: topicSources("hardware-aware-attention"),
  },
  {
    slug: "reasoning-budget",
    topic: "inference-time-compute",
    title: "推理预算与 Best-of-N",
    shortTitle: "推理预算",
    description: "把单次成功率、验证器准确率和采样成本放在一起，观察“多试几次”何时仍有收益。",
    question: "增加推理次数会线性提高可靠答案概率，但验证成本和延迟如何反噬？",
    evidence: "独立同分布假设下的概率模型；真实模型的样本相关性会降低收益。",
    staticConclusion:
      "8 次采样在单次成功率 25% 时可把至少一个正确答案的概率提高到约 90%；如果验证器不可靠，实际成功率会明显低于理论上限。",
    fields: [
      field("attempts", "采样次数", 8, 1, 64, 1, "并行或串行尝试数"),
      field("successRate", "单次成功率", 0.25, 0.01, 0.99, 0.01, "题目级成功率"),
      field("verifierAccuracy", "验证器准确率", 0.9, 0.5, 0.99, 0.01, "从候选中选中正确答案的概率"),
      field("costPerAttempt", "单次成本", 1.5, 0.1, 20, 0.1, "统一成本单位", "cost"),
    ],
    sources: topicSources("inference-time-compute"),
  },
  {
    slug: "tool-loop",
    topic: "mcp-trust-boundary",
    title: "工具循环故障预算",
    shortTitle: "Agent 工具循环",
    description: "模拟多步工具调用在超时、重试与幂等条件下的成功率和副作用暴露。",
    question: "Agent 的“自我修复”重试，什么时候会把偶发故障放大成重复副作用？",
    evidence: "离散期望模型；用于讨论边界，不替代故障注入和真实沙箱。",
    staticConclusion:
      "当每步成功率为 95%、需要 8 步时，整条链路按时完成的概率约 66%。重试必须与幂等、预算和截止期一起设计。",
    fields: [
      field("steps", "工具步数", 8, 1, 32, 1, "一次任务需要调用的工具数"),
      field("successRate", "单步成功率", 0.95, 0.5, 0.999, 0.001, "工具返回可接受结果的概率"),
      field("retries", "最多重试次数", 2, 0, 8, 1, "单步失败后的重试预算"),
      field("idempotency", "幂等覆盖率", 100, 0, 100, 5, "写操作具备幂等键的比例", "%"),
    ],
    sources: topicSources("mcp-trust-boundary"),
  },
  {
    slug: "moe-routing",
    topic: "sparse-moe",
    title: "MoE 路由与专家缓存",
    shortTitle: "MoE 路由",
    description: "观察总参数、激活专家数和路由偏斜如何共同影响显存足迹与尾延迟。",
    question: "为什么稀疏激活不等于按比例减少部署成本？",
    evidence: "路由与缓存近似模型；真实吞吐取决于批处理、专家并行和通信拓扑。",
    staticConclusion:
      "稀疏激活降低每 token 的矩阵乘工作量，但全部专家仍可能需要常驻显存；路由越偏斜，热点专家越容易成为尾延迟来源。",
    fields: [
      field("totalParams", "总参数量", 47, 7, 671, 1, "模型总规模", "B"),
      field("totalExperts", "专家总数", 8, 2, 256, 1, "每层可选专家数"),
      field("activeExperts", "每 token 激活", 2, 1, 16, 1, "top-k 路由"),
      field("tokens", "批内 token 数", 4096, 128, 131072, 128, "一个批次处理的 token 数"),
      field("cacheSlots", "专家缓存槽", 6, 1, 128, 1, "可常驻的专家数量"),
      field("skew", "路由偏斜", 35, 0, 90, 5, "热点专家集中程度", "%"),
    ],
    sources: topicSources("sparse-moe"),
  },
  {
    slug: "tinyml-budget",
    topic: "edge-small-models",
    title: "TinyML SRAM 与量化预算",
    shortTitle: "TinyML 预算",
    description: "把权重、激活、KV 与运行时开销放在同一块 SRAM 预算中检查是否可部署。",
    question: "一个参数量看似很小的模型，为什么仍然放不进 MCU？",
    evidence: "静态容量模型；实际可用 SRAM 会受链接脚本、栈和 DMA 缓冲区影响。",
    staticConclusion:
      "默认 4-bit 权重方案需要约 953 KiB 仅存放 2M 参数，已经超过 512 KiB SRAM；端侧模型必须同时优化权重、激活和 KV。",
    fields: [
      field("params", "参数量", 2, 0.1, 40, 0.1, "模型权重规模", "M"),
      field("bits", "权重位宽", 4, 1, 16, 1, "4-bit / 8-bit 量化", "bit"),
      field("activationKB", "激活缓冲", 96, 8, 2048, 8, "峰值激活占用", "KiB"),
      field("kvKB", "KV 缓冲", 64, 0, 2048, 8, "上下文缓存占用", "KiB"),
      field("sramKB", "可用 SRAM", 512, 64, 8192, 64, "链接脚本可分配容量", "KiB"),
      field("overhead", "运行时开销", 20, 0, 60, 5, "栈、对齐与 DMA 余量", "%"),
    ],
    sources: topicSources("edge-small-models"),
  },
  {
    slug: "riscv-roofline",
    topic: "riscv-ai-accelerators",
    title: "RISC-V 数据移动模型",
    shortTitle: "RISC-V Roofline",
    description: "比较算力、带宽和算术强度，判断 RISC-V 推理负载被哪一侧约束。",
    question: "增加向量核心或 NPU 峰值算力，何时会被数据移动抵消？",
    evidence: "Roofline 量级模型；不是特定 RISC-V 板卡的实测。",
    staticConclusion:
      "当每字节只能提供少量运算时，更多核心不会改善性能；软件基线、数据复用与内存层级必须同步设计。",
    fields: [
      field("peakTFLOPS", "峰值算力", 0.5, 0.01, 100, 0.01, "加速器/向量单元峰值", "TFLOPS"),
      field("bandwidthGBs", "有效带宽", 24, 1, 512, 1, "HBM/SRAM/DDR 的有效带宽", "GB/s"),
      field("intensity", "算术强度", 12, 0.1, 512, 0.1, "每字节执行的运算数", "ops/byte"),
      field("utilization", "算力利用率", 55, 5, 100, 1, "kernel 实际可达峰值比例", "%"),
      field("modelMB", "工作集", 128, 1, 8192, 1, "单次推理的数据规模", "MiB"),
    ],
    sources: topicSources("riscv-ai-accelerators"),
  },
  {
    slug: "chiplet-budget",
    topic: "chiplet-edge-ai",
    title: "Chiplet 带宽、能耗与良率",
    shortTitle: "Chiplet 预算",
    description: "检查 Die-to-Die 带宽、传输能耗和制造良率，理解模块化为边缘 SoC 带来的真实账本。",
    question: "把 AI 加速器拆成 Chiplet 后，省下的面积是否足以支付互连成本？",
    evidence: "简化敏感性模型；封装拓扑、SerDes 与热约束需要更细的物理设计数据。",
    staticConclusion:
      "默认模型显示，带宽和每字节能耗往往比“逻辑面积复用”更早成为边缘 AI Chiplet 的约束。",
    fields: [
      field("tokens", "每批 token", 16, 1, 1024, 1, "批内 token 数"),
      field("bytesPerTokenMB", "每 token 传输", 2, 0.01, 128, 0.01, "跨 Chiplet 的数据量", "MiB"),
      field("bandwidthGBs", "互连带宽", 256, 4, 4096, 4, "D2D 有效带宽", "GB/s"),
      field("energyPJByte", "每字节能耗", 0.45, 0.01, 10, 0.01, "互连能耗", "pJ/B"),
      field("powerW", "功耗预算", 8, 0.5, 300, 0.5, "加速器/互连功耗", "W"),
      field("defect", "缺陷密度", 0.18, 0.01, 2, 0.01, "用于良率估算", "/cm²"),
    ],
    sources: topicSources("chiplet-edge-ai"),
  },
  {
    slug: "sparsity-energy",
    topic: "compute-in-memory",
    title: "稀疏与事件能耗模型",
    shortTitle: "稀疏能耗",
    description: "把稀疏度、CIM 效率与事件开销放在一起，观察能效优势何时被控制开销吃掉。",
    question: "存算一体和神经形态计算的能效，何时来自计算本身，何时来自数据稀疏性？",
    evidence: "简化能耗模型；不替代器件级仿真。",
    staticConclusion: "稀疏负载的收益取决于事件生成、索引与同步开销；高稀疏并不自动等于高能效。",
    fields: [
      field("denseOps", "稠密运算量", 4, 0.01, 1000, 0.01, "统一为 GFLOP-equivalent", "GOP"),
      field("sparsity", "稀疏度", 75, 0, 99, 1, "可跳过的零值比例", "%"),
      field("cimEfficiency", "CIM 能效提升", 3, 0.5, 20, 0.5, "相对数字基线的倍数"),
      field("eventOverhead", "事件开销", 18, 0, 100, 1, "索引、同步与路由开销", "%"),
      field("powerW", "工作功耗", 0.8, 0.01, 50, 0.01, "目标器件功耗", "W"),
    ],
    sources: topicSources("compute-in-memory"),
  },
  {
    slug: "trust-budget",
    topic: "trusted-embedded-stack",
    title: "实时安全与 PQC 开销",
    shortTitle: "可信嵌入预算",
    description: "把后量子签名/验证周期、迭代次数和截止期放在一起，判断安全策略是否仍满足实时性。",
    question: "内存安全之外，密码学开销和调度抖动会不会把系统重新推回不可信？",
    evidence: "周期级预算模型；实际结果依赖指令集、加速器、栈和功耗状态。",
    staticConclusion:
      "PQC 不只是一个算法替换；密钥/签名尺寸、验证延迟和在控制回路中的位置都会改变系统可调度性。",
    fields: [
      field(
        "signCycles",
        "签名周期",
        420000,
        1000,
        10000000,
        1000,
        "单次签名的 CPU/加速器周期",
        "cycles",
      ),
      field("verifyCycles", "验证周期", 120000, 1000, 5000000, 1000, "单次验证周期", "cycles"),
      field("clockMHz", "时钟频率", 160, 8, 2000, 1, "目标 MCU/SoC 频率", "MHz"),
      field("iterations", "每周期次数", 2, 1, 100, 1, "一个控制周期内需要的签名/验证次数"),
      field("keyBytes", "密钥/签名存储", 6144, 64, 65536, 64, "PQC 密钥与签名占用", "B"),
      field("deadlineMs", "控制截止期", 20, 0.5, 1000, 0.5, "硬实时控制窗口", "ms"),
    ],
    sources: topicSources("trusted-embedded-stack"),
  },
];

export function getLab(slug: string): LabDefinition | undefined {
  return labDefinitions.find((lab) => lab.slug === slug);
}

export function evaluateLab(slug: string, values: Record<string, number>): LabResult {
  const read = (id: string) => {
    const lab = getLab(slug);
    const defaultValue = lab?.fields.find((item) => item.id === id)?.value ?? 0;
    const value = values[id];
    return Number.isFinite(value) ? value : defaultValue;
  };

  switch (slug) {
    case "kv-budget": {
      const layers = read("layers");
      const kvHeads = read("kvHeads");
      const headDim = read("headDim");
      const sequence = read("sequence");
      const concurrency = read("concurrency");
      const bytes = read("bytes");
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
    case "attention-roofline": {
      const sequence = read("sequence");
      const heads = read("heads");
      const headDim = read("headDim");
      const peak = read("peakTFLOPS");
      const bandwidth = read("bandwidthGBs");
      const bytes = read("bytes");
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
    case "reasoning-budget": {
      const attempts = read("attempts");
      const successRate = read("successRate");
      const verifier = read("verifierAccuracy");
      const cost = read("costPerAttempt");
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
    case "tool-loop": {
      const steps = read("steps");
      const successRate = read("successRate");
      const retries = read("retries");
      const idempotency = read("idempotency") / 100;
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
    case "moe-routing": {
      const total = read("totalParams");
      const activeFraction = read("activeExperts") / read("totalExperts");
      const residentFraction = Math.min(1, read("cacheSlots") / read("totalExperts"));
      const routingSkew = read("skew") / 100;
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
    case "tinyml-budget": {
      const params = read("params") * 1e6;
      const bits = read("bits");
      const weightKB = (params * bits) / 8 / 1024;
      const activationKB = read("activationKB");
      const kvKB = read("kvKB");
      const overhead = read("overhead") / 100;
      const usableKB = read("sramKB") / (1 + overhead);
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
    case "riscv-roofline": {
      const peak = read("peakTFLOPS");
      const bandwidth = read("bandwidthGBs");
      const intensity = read("intensity");
      const utilization = read("utilization") / 100;
      const modelMB = read("modelMB");
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
    case "chiplet-budget": {
      const bytes = read("tokens") * read("bytesPerTokenMB") * 2 ** 20;
      const transferMs = (bytes / (read("bandwidthGBs") * 1e9)) * 1000;
      const energyMJ = (bytes * read("energyPJByte")) / 1e9;
      const powerLimitMs = energyMJ / Math.max(0.01, read("powerW"));
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
    case "sparsity-energy": {
      const denseOps = read("denseOps");
      const sparsity = read("sparsity") / 100;
      const cimEfficiency = read("cimEfficiency");
      const overhead = read("eventOverhead") / 100;
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
    case "trust-budget": {
      const cycles = (read("signCycles") + read("verifyCycles")) * read("iterations");
      const latencyMs = cycles / (read("clockMHz") * 1000);
      const margin = read("deadlineMs") - latencyMs;
      const keyBytes = read("keyBytes") * read("iterations");
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
    default:
      return {
        verdict: "未注册实验",
        metrics: [],
      };
  }
}
