import type { LabKind, Maturity, SourceRef } from "./index";

export type FrontierCluster = "reasoning" | "silicon";

export interface FrontierScore {
  novelty: number;
  usefulness: number;
  evidence: number;
  engineering: number;
  edgeFit: number;
}

export interface FrontierTopic {
  id: string;
  order: number;
  rank: number;
  title: string;
  shortTitle: string;
  cluster: FrontierCluster;
  domain: "ai" | "embedded";
  summary: string;
  thesis: string;
  question: string;
  articles: string[];
  fusion: string[];
  maturity: Maturity;
  score: FrontierScore;
  sources: SourceRef[];
  flagshipPath: string;
  experimentPath: string;
  lab: LabKind;
  /** Compatibility alias used by presentation components. */
  labKind: LabKind;
}

export const FRONTIER_WEIGHTS: Record<keyof FrontierScore, number> = {
  novelty: 0.2,
  usefulness: 0.25,
  evidence: 0.25,
  engineering: 0.2,
  edgeFit: 0.1,
};

export function frontierScore(score: FrontierScore): number {
  const weighted = Object.entries(FRONTIER_WEIGHTS).reduce(
    (total, [key, weight]) => total + score[key as keyof FrontierScore] * weight,
    0,
  );
  return Math.round(weighted * 10) / 10;
}

export const weightedFrontierScore = frontierScore;
export const frontierSourceAccessDate = new Date("2026-10-18T00:00:00.000Z");

export const frontierTopics: FrontierTopic[] = [
  {
    id: "paged-kv-cache",
    order: 1,
    rank: 1,
    title: "PagedAttention 与分页式 KV Cache",
    shortTitle: "Paged KV",
    cluster: "reasoning",
    domain: "ai",
    summary: "把操作系统式分页带进推理服务，用块级 KV 管理换取更高并发与更低碎片。",
    thesis: "显存管理的对象不是一个上下文，而是许多长度不同的 KV 块；分页把外部碎片转成可计算的块预算。",
    question: "显存拥塞究竟来自模型权重，还是来自每个请求不断增长的 KV 账本？",
    articles: ["llm-agent/frontier/paged-kv-cache", "llm-agent/frontier/kv-cache-budget"],
    fusion: ["synthesis/memory-hierarchy"],
    maturity: "established",
    score: { novelty: 4.4, usefulness: 4.8, evidence: 4.7, engineering: 4.8, edgeFit: 3.6 },
    sources: [
      {
        title: "Efficient Memory Management for Large Language Model Serving with PagedAttention",
        url: "https://arxiv.org/abs/2309.06180",
        authors: "Kwon et al.",
        year: 2023,
        kind: "paper",
      },
      {
        title: "vLLM documentation",
        url: "https://docs.vllm.ai/",
        year: 2026,
        kind: "documentation",
      },
    ],
    flagshipPath: "llm-agent/frontier/paged-kv-cache",
    experimentPath: "llm-agent/frontier/kv-cache-budget",
    lab: "kv-budget",
    labKind: "kv-budget",
  },
  {
    id: "hardware-aware-attention",
    order: 2,
    rank: 2,
    title: "FlashAttention-2/3：把注意力写成 IO 问题",
    shortTitle: "Attention IO",
    cluster: "reasoning",
    domain: "ai",
    summary: "从精确注意力到 Hopper 异步流水线，核心不是少做运算，而是少搬数据。",
    thesis: "注意力的性能上限由片外带宽和片上复用共同决定，FlashAttention 是用分块重写数据流，而不是近似替代。",
    question: "当 FLOPs 不再是瓶颈，注意力算法应该如何围绕 SRAM 与 HBM 重写？",
    articles: [
      "llm-agent/frontier/hardware-aware-attention",
      "llm-agent/frontier/attention-roofline",
    ],
    fusion: ["synthesis/memory-hierarchy"],
    maturity: "established",
    score: { novelty: 4.5, usefulness: 4.7, evidence: 4.8, engineering: 4.8, edgeFit: 3.4 },
    sources: [
      {
        title: "FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning",
        url: "https://arxiv.org/abs/2307.08691",
        authors: "Dao",
        year: 2023,
        kind: "paper",
      },
      {
        title: "FlashAttention-3: Fast and Accurate Attention with Asynchrony and Low-precision",
        url: "https://arxiv.org/abs/2407.08608",
        authors: "Shah et al.",
        year: 2024,
        kind: "paper",
      },
    ],
    flagshipPath: "llm-agent/frontier/hardware-aware-attention",
    experimentPath: "llm-agent/frontier/attention-roofline",
    lab: "attention-roofline",
    labKind: "attention-roofline",
  },
  {
    id: "inference-time-compute",
    order: 3,
    rank: 3,
    title: "推理时计算扩展：让思考时间成为新维度",
    shortTitle: "Test-time compute",
    cluster: "reasoning",
    domain: "ai",
    summary: "从 best-of-N 到长思维链，比较“多想一会儿”与“换更大模型”的真实成本边界。",
    thesis: "推理时计算把延迟和 token 预算变成可调参数，但只有当验证器可靠、任务可分解时，额外思考才会兑现。",
    question: "什么任务值得把 FLOPs 花在推理阶段，什么任务只是在为不确定性交税？",
    articles: [
      "llm-agent/frontier/inference-time-compute",
      "llm-agent/frontier/reasoning-budget",
    ],
    fusion: ["synthesis/deadlines-and-agents"],
    maturity: "emerging",
    score: { novelty: 4.8, usefulness: 4.7, evidence: 4.1, engineering: 4.4, edgeFit: 3.2 },
    sources: [
      {
        title: "Scaling LLM Test-Time Compute Optimally can be More Effective than Scaling Model Parameters",
        url: "https://arxiv.org/abs/2408.03314",
        authors: "Snell et al.",
        year: 2024,
        kind: "paper",
      },
      {
        title: "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning",
        url: "https://arxiv.org/abs/2501.12948",
        authors: "DeepSeek-AI",
        year: 2025,
        kind: "paper",
      },
      {
        title: "s1: Simple test-time scaling",
        url: "https://arxiv.org/abs/2501.19393",
        authors: "Muennighoff et al.",
        year: 2025,
        kind: "paper",
      },
    ],
    flagshipPath: "llm-agent/frontier/inference-time-compute",
    experimentPath: "llm-agent/frontier/reasoning-budget",
    lab: "reasoning-budget",
    labKind: "reasoning-budget",
  },
  {
    id: "mcp-trust-boundary",
    order: 4,
    rank: 4,
    title: "MCP 信任边界与 Agent 工具安全",
    shortTitle: "MCP boundary",
    cluster: "reasoning",
    domain: "ai",
    summary: "协议标准化了工具接入，也把提示注入、权限扩散和供应链风险带进运行路径。",
    thesis: "MCP 解决的是工具互通，不自动解决信任；权限、幂等、截止期和回滚必须由宿主运行时承担。",
    question: "当模型可以调用真实系统，最小权限、可审计与可回滚应如何进入协议设计？",
    articles: ["llm-agent/frontier/mcp-trust-boundary", "llm-agent/frontier/agent-reliability"],
    fusion: ["synthesis/deadlines-and-agents"],
    maturity: "emerging",
    score: { novelty: 4.7, usefulness: 4.9, evidence: 3.9, engineering: 4.7, edgeFit: 3.8 },
    sources: [
      {
        title: "Model Context Protocol specification",
        url: "https://modelcontextprotocol.io/specification/2025-06-18",
        year: 2025,
        kind: "specification",
      },
      {
        title: "SWE-bench: Can Language Models Resolve Real-World GitHub Issues?",
        url: "https://arxiv.org/abs/2310.06770",
        authors: "Jimenez et al.",
        year: 2024,
        kind: "paper",
      },
      {
        title: "Not what you've signed up for: Compromising Real-World LLM-Integrated Applications with Indirect Prompt Injection",
        url: "https://arxiv.org/abs/2302.12173",
        authors: "Greshake et al.",
        year: 2023,
        kind: "paper",
      },
    ],
    flagshipPath: "llm-agent/frontier/mcp-trust-boundary",
    experimentPath: "llm-agent/frontier/agent-reliability",
    lab: "tool-loop",
    labKind: "tool-loop",
  },
  {
    id: "sparse-moe",
    order: 5,
    rank: 5,
    title: "稀疏 MoE：参数规模不等于计算规模",
    shortTitle: "Sparse MoE",
    cluster: "reasoning",
    domain: "ai",
    summary: "总参数、激活参数、专家并行与路由抖动共同决定服务成本，单看参数量会误判。",
    thesis: "MoE 稀疏的是每 token 的计算，不是部署足迹；专家放置、通信与路由偏斜会重新制造尾延迟。",
    question: "MoE 的“稀疏”到底省下了什么，又把成本转移到了哪里？",
    articles: ["llm-agent/frontier/sparse-moe", "llm-agent/frontier/moe-routing"],
    fusion: ["synthesis/memory-hierarchy"],
    maturity: "established",
    score: { novelty: 4.5, usefulness: 4.6, evidence: 4.6, engineering: 4.7, edgeFit: 4.0 },
    sources: [
      {
        title: "Mixtral of Experts",
        url: "https://arxiv.org/abs/2401.04088",
        authors: "Jiang et al.",
        year: 2024,
        kind: "paper",
      },
      {
        title: "DeepSeekMoE: Towards Ultimate Expert Specialization in Mixture-of-Experts Language Models",
        url: "https://arxiv.org/abs/2401.06066",
        authors: "Dai et al.",
        year: 2024,
        kind: "paper",
      },
    ],
    flagshipPath: "llm-agent/frontier/sparse-moe",
    experimentPath: "llm-agent/frontier/moe-routing",
    lab: "moe-routing",
    labKind: "moe-routing",
  },
  {
    id: "edge-small-models",
    order: 6,
    rank: 6,
    title: "端侧小模型与 TinyML 部署边界",
    shortTitle: "Edge SLM",
    cluster: "silicon",
    domain: "embedded",
    summary: "结构、量化和运行时共同压缩端侧预算；能用小模型替代 API 的判断比模型榜单更重要。",
    thesis: "端侧模型是否可用，要同时看权重、KV、激活、运行时和热预算；参数量只是第一层过滤器。",
    question: "当权重、KV、激活和运行时都要塞进 MB 级预算，哪种优化真正决定可用性？",
    articles: ["embedded/frontier/edge-small-models", "embedded/frontier/edge-memory-budget"],
    fusion: ["synthesis/memory-hierarchy"],
    maturity: "emerging",
    score: { novelty: 4.6, usefulness: 4.8, evidence: 4.4, engineering: 4.7, edgeFit: 5.0 },
    sources: [
      {
        title: "MobileLLM: Optimizing Sub-billion Parameter Language Models for On-Device Use Cases",
        url: "https://arxiv.org/abs/2402.14905",
        authors: "Liu et al.",
        year: 2024,
        kind: "paper",
      },
      {
        title: "Phi-3 Technical Report",
        url: "https://arxiv.org/abs/2404.14219",
        authors: "Abdin et al.",
        year: 2024,
        kind: "paper",
      },
      {
        title: "AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration",
        url: "https://arxiv.org/abs/2306.00978",
        authors: "Lin et al.",
        year: 2023,
        kind: "paper",
      },
    ],
    flagshipPath: "embedded/frontier/edge-small-models",
    experimentPath: "embedded/frontier/edge-memory-budget",
    lab: "tinyml-budget",
    labKind: "tinyml-budget",
  },
  {
    id: "riscv-ai-accelerators",
    order: 7,
    rank: 7,
    title: "RISC-V AI 加速：许多小核与可组合软件栈",
    shortTitle: "RISC-V AI",
    cluster: "silicon",
    domain: "embedded",
    summary: "从 many-tiny-core 推理到 RVA23 基线，真正的难点是数据移动与软件可移植性。",
    thesis: "RISC-V 提供开放扩展点，但 AI 加速的胜负取决于数据流、工具链与可移植基线，而不是指令集标签。",
    question: "RISC-V 的开放扩展能否把 AI 加速从“定制硬件”变成可复用的系统工程？",
    articles: ["embedded/frontier/riscv-ai-accelerators", "embedded/frontier/riscv-dataflow"],
    fusion: ["synthesis/memory-hierarchy"],
    maturity: "experimental",
    score: { novelty: 4.7, usefulness: 4.1, evidence: 3.9, engineering: 4.4, edgeFit: 4.8 },
    sources: [
      {
        title: "Many-Tiny-Core RISC-V AI Accelerator",
        url: "https://arxiv.org/abs/2405.19284",
        year: 2024,
        kind: "paper",
      },
      {
        title: "RISC-V AI accelerator architecture paper",
        url: "https://arxiv.org/abs/2405.15380",
        year: 2024,
        kind: "paper",
      },
      {
        title: "RVA23 Profile specification",
        url: "https://riscv.org/technical/specifications/",
        year: 2024,
        kind: "specification",
      },
    ],
    flagshipPath: "embedded/frontier/riscv-ai-accelerators",
    experimentPath: "embedded/frontier/riscv-dataflow",
    lab: "riscv-roofline",
    labKind: "riscv-roofline",
  },
  {
    id: "chiplet-edge-ai",
    order: 8,
    rank: 8,
    title: "边缘 AI Chiplet：模块化算力的带宽墙",
    shortTitle: "Edge chiplets",
    cluster: "silicon",
    domain: "embedded",
    summary: "UCIe 让芯粒互连标准化，但功耗、封装、带宽密度和良率仍决定它是否适合边缘设备。",
    thesis: "Chiplet 把单片面积问题拆成可组合的系统问题，同时把互连、封装、功耗与良率风险推到前台。",
    question: "Chiplet 是把大芯片拆小，还是把系统复杂度转移给互连与封装？",
    articles: ["embedded/frontier/chiplet-edge-ai", "embedded/frontier/chiplet-bandwidth"],
    fusion: ["synthesis/memory-hierarchy"],
    maturity: "experimental",
    score: { novelty: 4.8, usefulness: 4.0, evidence: 3.8, engineering: 4.3, edgeFit: 4.7 },
    sources: [
      {
        title: "Modular Edge AI SoC with Chiplets",
        url: "https://arxiv.org/abs/2509.18355",
        year: 2025,
        kind: "paper",
      },
      {
        title: "UCIe specifications",
        url: "https://www.uciexpress.org/specifications",
        year: 2025,
        kind: "specification",
      },
    ],
    flagshipPath: "embedded/frontier/chiplet-edge-ai",
    experimentPath: "embedded/frontier/chiplet-bandwidth",
    lab: "chiplet-budget",
    labKind: "chiplet-budget",
  },
  {
    id: "compute-in-memory",
    order: 9,
    rank: 9,
    title: "存算一体与神经形态：能效边界而非万能替代",
    shortTitle: "CIM / neuromorphic",
    cluster: "silicon",
    domain: "embedded",
    summary: "在权重读取成为主成本时，CIM 与事件驱动架构提供另一条路径，但精度与生态仍是门槛。",
    thesis: "存算一体和神经形态的价值来自数据移动与稀疏性，而不是“替代 GPU”的叙事；控制开销决定收益能否保留。",
    question: "当数据搬运吃掉大部分能耗，计算应该靠近存储还是彻底改变事件表示？",
    articles: ["embedded/frontier/compute-in-memory", "embedded/frontier/cim-sparsity"],
    fusion: ["synthesis/memory-hierarchy"],
    maturity: "experimental",
    score: { novelty: 4.9, usefulness: 3.7, evidence: 3.6, engineering: 3.9, edgeFit: 4.8 },
    sources: [
      {
        title: "CIMPool: Compute-in-Memory pooling",
        url: "https://arxiv.org/abs/2503.22044",
        year: 2025,
        kind: "paper",
      },
      {
        title: "Neuromorphic computing research",
        url: "https://arxiv.org/abs/2510.06721",
        year: 2025,
        kind: "paper",
      },
      {
        title: "Compute-in-memory architecture research",
        url: "https://arxiv.org/abs/2604.04727",
        year: 2026,
        kind: "paper",
      },
    ],
    flagshipPath: "embedded/frontier/compute-in-memory",
    experimentPath: "embedded/frontier/cim-sparsity",
    lab: "sparsity-energy",
    labKind: "sparsity-energy",
  },
  {
    id: "trusted-embedded-stack",
    order: 10,
    rank: 10,
    title: "可信嵌入式栈：安全不等于实时安全",
    shortTitle: "Trusted edge",
    cluster: "silicon",
    domain: "embedded",
    summary: "Rust、TinyML 安全与 PQC 共同改变嵌入式威胁模型，也带来新的时序和资源预算。",
    thesis: "内存安全、实时性和后量子迁移是同一张预算表上的约束；任何“默认安全”都不应牺牲截止期。",
    question: "内存安全、实时性与后量子迁移，三者的约束如何在同一个设备上共存？",
    articles: ["embedded/frontier/trusted-embedded-stack", "embedded/frontier/pqc-ledger"],
    fusion: ["synthesis/deadlines-and-agents"],
    maturity: "emerging",
    score: { novelty: 4.7, usefulness: 4.8, evidence: 4.2, engineering: 4.6, edgeFit: 4.9 },
    sources: [
      {
        title: "Embedded Rust: security and systems programming",
        url: "https://arxiv.org/abs/2311.05063",
        year: 2023,
        kind: "paper",
      },
      {
        title: "MISRust: Memory safety for embedded Rust",
        url: "https://arxiv.org/abs/2605.23490",
        year: 2026,
        kind: "paper",
      },
      {
        title: "TinyML security",
        url: "https://arxiv.org/abs/2411.07114",
        year: 2024,
        kind: "paper",
      },
      {
        title: "Post-quantum cryptography for constrained devices",
        url: "https://arxiv.org/abs/2504.13537",
        year: 2025,
        kind: "paper",
      },
    ],
    flagshipPath: "embedded/frontier/trusted-embedded-stack",
    experimentPath: "embedded/frontier/pqc-ledger",
    lab: "trust-budget",
    labKind: "trust-budget",
  },
];

export const synthesisNotes = [
  {
    id: "memory-hierarchy",
    title: "从 HBM 到 MCU：一条内存层级主线",
    path: "synthesis/memory-hierarchy",
    href: "/synthesis/memory-hierarchy/",
    summary: "把 KV Cache、FlashAttention、端侧模型与 CIM 放进同一张数据移动账本。",
  },
  {
    id: "deadlines-and-agents",
    title: "截止期遇见图灵：Agent 编排的实时系统思维",
    path: "synthesis/deadlines-and-agents",
    href: "/synthesis/deadlines-and-agents/",
    summary: "用截止期、优先级与可回滚状态重新理解 Agent 工具链的可靠性。",
  },
] as const;

export function getFrontierTopic(id: string): FrontierTopic | undefined {
  return frontierTopics.find((topic) => topic.id === id);
}

export function getFrontierTopicByPath(path: string): FrontierTopic | undefined {
  return frontierTopics.find(
    (topic) => topic.flagshipPath === path || topic.experimentPath === path,
  );
}
