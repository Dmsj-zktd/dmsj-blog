---
title: "从 HBM 到 MCU：一条内存层级主线"
description: "把 KV Cache、FlashAttention、端侧模型与存算一体放进同一张数据移动账本，理解 AI 系统的真正成本。"
date: 2026-10-18
tags: ["内存层级", "KV Cache", "FlashAttention", "TinyML", "存算一体"]
series: "Signal Lab 综合研究"
seriesOrder: 1
kind: "synthesis"
maturity: "experimental"
featured: true
verifiedAt: 2026-10-18
question: "为什么从数据中心 GPU 到毫瓦级 MCU，AI 优化的主角始终是数据移动？"
conclusion: "模型、缓存、量化和专用硬件的共同目标，是在正确的时间把正确的一小块数据放到计算单元旁边。参数量只是入口，内存层级与复用距离才决定系统的能效、延迟和可部署边界。"
takeaways:
  - "KV Cache 把重复计算换成容量压力，分页管理优化的是块级分配，不改变每个 token 的字节数。"
  - "FlashAttention 不减少注意力的数学结果，而是通过分块与片上复用减少 HBM 往返。"
  - "端侧部署必须同时核算权重、激活、KV、运行时与热预算，单看参数量会高估可行性。"
  - "CIM 与事件驱动硬件的收益来自数据复用和稀疏性，控制、精度与外围电路会吞掉一部分理论优势。"
evidence:
  level: "analyzed"
  scope: "基于公开论文、官方文档与本地预算模型的分析，不包含特定 GPU、FPGA 或 MCU 的实机测量。"
  caveats:
    - "不同实现的 tile、并行度、精度和缓存策略会显著改变量级。"
    - "论文报告的性能数字只在对应软硬件条件与基准规模下成立。"
sources:
  - title: "Efficient Memory Management for Large Language Model Serving with PagedAttention"
    url: "https://arxiv.org/abs/2309.06180"
    authors: "Kwon et al."
    year: 2023
    kind: "paper"
  - title: "FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning"
    url: "https://arxiv.org/abs/2307.08691"
    authors: "Dao"
    year: 2023
    kind: "paper"
  - title: "MobileLLM: Optimizing Sub-billion Parameter Language Models for On-Device Use Cases"
    url: "https://arxiv.org/abs/2402.14905"
    authors: "Liu et al."
    year: 2024
    kind: "paper"
  - title: "AWQ: Activation-aware Weight Quantization for LLM Compression and Acceleration"
    url: "https://arxiv.org/abs/2306.00978"
    authors: "Lin et al."
    year: 2023
    kind: "paper"
  - title: "CIMPool: Compute-in-Memory Pooling"
    url: "https://arxiv.org/abs/2503.22044"
    year: 2025
    kind: "paper"
lab: "kv-budget"
related:
  - "llm-agent/frontier/paged-kv-cache"
  - "llm-agent/frontier/hardware-aware-attention"
  - "embedded/frontier/edge-small-models"
  - "embedded/frontier/compute-in-memory"
---

如果把最近三年的 AI 优化论文放在一起看，会发现一个不太显眼却非常稳定的共同点：真正的瓶颈经常不在“算得够不够快”，而在“数据离计算单元有多远”。从 HBM 到 SRAM，再到 MCU 内部的几十 KiB 存储，每一层都在用容量、带宽和能耗交换时间。

这篇文章不把 KV Cache、FlashAttention、端侧小模型和存算一体当成四个孤立热点，而是把它们放进同一条账本：数据产生一次，能被复用多少次，搬运一次要付多少成本。

## 一个统一的成本模型

对一次计算，可以先写出三个量：

$$
E \approx E_{\text{compute}} + E_{\text{move}}, \qquad
T \approx \max(T_{\text{compute}}, T_{\text{memory}})
$$

$E_{\text{compute}}$ 是乘法、加法和控制逻辑的能耗，$E_{\text{move}}$ 是数据从存储层移动到计算单元的能耗。越靠近计算单元，访问通常越快、越省能，但容量越小、价格越高。优化就是决定哪些数据值得放进更近的一层。

| 层级 | 典型容量 | 主要优势 | 主要代价 |
| --- | --- | --- | --- |
| HBM / 显存 | 数十 GB | 高带宽、适合大模型 | 功耗、封装与容量成本 |
| 片内 SRAM | 数百 KB 到数十 MB | 低延迟、低单次访问能耗 | 面积昂贵、容量有限 |
| 片上缓存 / 寄存器 | KB 级 | 最快复用 | 需要精细调度 |
| MCU SRAM | 几十到几百 KiB | 实时、低功耗 | 任何多出来的缓冲都昂贵 |
| 非易失存储 | MB 到 GB | 断电保持、容量大 | 写入寿命、访问延迟 |

注意，这里的“层级”不是按物理位置简单排列。一个边缘 SoC 可能同时拥有外部 DRAM、片上 SRAM、NPU 本地缓冲和 MCU 紧耦合内存。关键是数据在每一层之间移动了几次。

## KV Cache：用容量换重复计算

自回归解码每生成一个 token，都需要让当前查询看见历史 token。如果没有缓存，每一步都要重新投影全部历史 K/V。KV Cache 保存历史张量，把重复矩阵乘换成显存驻留。

每个 token 的缓存字节数可以写成：

$$
B_{\text{kv/token}} = 2 \times L \times H_{\text{kv}} \times d_{\text{head}} \times b
$$

其中 $L$ 是层数，$H_{\text{kv}}$ 是 KV heads 数量，$d_{\text{head}}$ 是头维度，$b$ 是每个元素的字节数，前面的 2 分别代表 K 和 V。这里必须使用 KV heads，而不是注意力头总数；GQA/MQA 正是通过减少 $H_{\text{kv}}$ 来降低长上下文成本。

例如 32 层、8 个 KV heads、head 维度 128、FP16 时，每个 token 约占 128 KiB。8K 上下文、16 路并发就意味着约 16 GiB 的缓存，仅缓存本身就可能吃掉一张加速卡的大部分显存。

PagedAttention 的贡献不是改变这条字节公式，而是把连续上下文拆成固定大小的物理块，按需分配并允许多个请求共享块。它把操作系统式的“虚拟地址到物理块”思想带进推理服务，减少预留和碎片，让连续批处理更容易维持高并发。

本地实验 [KV 容量账本](/lab/kv-budget/) 可以直接拨动层数、KV heads、上下文和并发数。默认假设下，它会显示缓存增长的速度远快于很多人对“7B 模型”的直觉。

## FlashAttention：把 HBM 往返切成片上块

标准注意力需要计算 $QK^\top$，再做 softmax 与 $V$ 的加权和。数学上，精确注意力的 FLOPs 没有变；工程上，朴素实现会反复把巨大的中间矩阵写回 HBM。

FlashAttention 的核心是分块：把 Q、K、V 切成能放进 SRAM 的 tile，在片上完成局部注意力并在线累积 softmax 的归一化项。这样，中间结果不必完整落回 HBM。FlashAttention-2 进一步改善并行划分与工作分配；FlashAttention-3 则利用 Hopper 的异步执行和低精度能力，把计算、数据搬运和同步重叠起来。

这里的关键不是“少算”，而是“少搬”。当算术强度低于硬件的 roofline 拐点时，继续堆峰值算力收益有限；先把重复读取消掉，才可能接近计算上限。你可以用 [注意力 Roofline](/lab/attention-roofline/) 改变序列长度和带宽，观察工作点如何从计算侧滑向带宽侧。

## 端侧：所有预算同时存在

到了 MCU 或手机端，内存层级不再是一条宽阔的高速公路，而是一组彼此挤压的抽屉。一个模型能否部署，至少需要同时满足：

$$
M_{\text{weights}} + M_{\text{activations}} + M_{\text{kv}} + M_{\text{runtime}}
\leq M_{\text{available}}
$$

MobileLLM 等工作说明，亚十亿参数模型的结构选择、深度与宽度、量化和分词策略会共同影响端侧表现；AWQ 则通过保护激活显著的权重通道来降低量化误差。它们解决的是不同层的问题，不能互相替代。

在资源更紧的 TinyML 场景里，Flash 可以放权重，SRAM 却要同时容纳激活、栈、DMA 缓冲和 KV。即使权重只有几百 KiB，峰值激活也可能让系统无法在目标帧率内完成推理。CIM 把乘加搬到存储阵列附近，减少权重读取，但 ADC、外围控制、精度和非零索引仍要付费。稀疏度高并不自动等于能效高，因为事件生成和同步本身也会消耗能量。

## 把四件事连成一条主线

可以用三个问题审视任何 AI 系统优化：

1. **复用距离**：同一份数据在返回 HBM 前被使用了多少次？
2. **容量压力**：缓存、激活或权重是否把下一层预算挤爆？
3. **控制开销**：分页、路由、稀疏索引和安全协议是否引入了新的尾延迟？

KV Cache 主要回答容量压力；FlashAttention 主要回答复用距离；端侧量化同时改变容量与计算；CIM 试图把复用距离压到阵列内部。四者的共同敌人都是无意义的数据往返。

## 用一个预算例子把层级串起来

为了避免结论停留在口号，可以把一个具体的服务配置写成预算表。假设模型有 32 层、8 个 KV heads、head 维度 128，权重以 FP16 保存，单个请求需要 8K 上下文，服务希望保持 16 路并发。按前文的 KV 公式，每个 token 的缓存是 128 KiB，因此单请求约 1 GiB，16 路并发仅 KV 就要 16 GiB。再加上约 14 GB 的 7B 权重、激活、tokenizer、CUDA/运行时和分配器余量，24 GiB 级别的加速卡很快就没有安全空间。

这张账本解释了几件事：

1. 分页并不等于“让缓存变小”。它让缓存块可以按需分配，减少预留和碎片，但如果每个活跃请求都已经接近 1 GiB，容量主约束依然存在。
2. 连续批处理也不是无条件扩大并发。新请求只能在块池仍有空间时加入；当长请求占住大量块，服务应该优先考虑块预算和尾延迟，而不是只追求吞吐。
3. GQA、KV 量化和滑动窗口会改变每个 token 的字节数或可见历史，效果比“换一个更快的 kernel”更直接。它们必须和模型质量、兼容性一起评估。
4. PagedAttention 的块大小同样有权衡。以 16 token 一块为例，默认配置下每块约 2 MiB；块越大，元数据越少，但请求尾部预留越粗；块越小，分配细，但块表和调度开销更高。

同样的思路放到边缘设备上，容量从 GiB 变成 KiB。一个 200 万参数、4-bit 权重的模型理论上需要约 0.95 MiB 仅存权重；如果目标 MCU 只有 512 KiB SRAM，即使把激活和 KV 压到极小，也不能直接把完整权重驻留在 SRAM。Flash 可以存放权重，但读取 Flash 的延迟、带宽和 cache miss 会进入实时预算。此时真正的设计问题是：哪些层或专家值得常驻，哪些数据可以按块流式加载，以及一次 miss 是否会破坏控制截止期。

## 共同的工程检查表

在云端或端侧，建议用同一组问题审查优化方案：

- **数据流**：输入、权重、KV、激活和输出分别位于哪一层？每一次计算前需要移动哪些数据？
- **容量**：最坏上下文、最大并发和目标设备的可用内存能否同时满足？碎片和运行时开销是否留有余量？
- **复用**：中间结果会被复用多少次？如果只复用一次，分页或缓存的收益是否足以覆盖控制成本？
- **时间**：平均吞吐之外，最慢的请求或控制周期是多少？块池耗尽、专家热点和锁竞争会不会形成长尾？
- **精度**：量化、稀疏和近似是否改变了任务质量？误差是否会通过验证器或实时反馈循环放大？
- **证据**：数字来自论文、模拟器、预算公式还是目标硬件测量？基线、规模、精度和软件版本是否写全？

一个靠谱的优化提案应该同时说明“省了什么”和“把成本转移到了哪里”。例如，KV 量化节省了显存，却可能增加反量化计算或降低长上下文质量；CIM 减少了权重搬运，却引入 ADC、阵列控制和精度问题；PagedAttention 减少了碎片，却增加了块表和调度复杂度。只有把这些交换写进同一张预算，才知道系统是否真的更快。

## 结论与边界

“内存墙”不是一句泛化的口号。对具体系统，必须把模型形状、序列长度、批大小、目标硬件、精度和运行时一起代入。本文给出的公式与实验是量级工具，不是性能承诺；论文中的加速比也不能脱离基准与硬件条件直接复现到另一个系统。

真正可迁移的方法是：先画数据流，再算每一层的容量与搬运，最后才讨论算法是否“先进”。当你能说清楚一个 token、一个权重块或一次 DMA 传输在哪里被复用，优化方向通常已经浮出水面。

把这张检查表固定在评审模板里，比记住某个框架的参数更有价值：它能迫使团队在追求吞吐之前先确认数据路径、峰值容量和尾延迟，也能让论文结论与工程模拟保持同一条证据链，并据此安排下一步验证。
