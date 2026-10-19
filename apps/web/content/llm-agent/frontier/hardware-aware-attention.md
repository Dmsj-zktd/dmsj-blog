---
title: "FlashAttention：把注意力从公式写成数据流"
description: "从 HBM/SRAM 层级解释 tiling、在线 softmax 与 FlashAttention-2/3 的并行和异步优化。"
date: 2026-10-12
tags: ["FlashAttention", "注意力机制", "GPU", "Roofline"]
series: "Signal Lab · LLM 推理"
kind: "flagship"
topic: "hardware-aware-attention"
maturity: "established"
featured: true
verifiedAt: 2026-10-18
question: "同一组精确注意力数学，为什么换一种执行顺序就能显著改变速度？"
conclusion: "FlashAttention 将 Q/K/V 分块放入片上 SRAM，在线累积 softmax 统计量，避免完整注意力矩阵频繁落回 HBM。性能提升来自 IO 与并行调度，不是近似计算。"
takeaways:
  - "注意力高带宽下的瓶颈常是中间矩阵读写，而非 FLOPs 本身。"
  - "在线 softmax 让分块计算保持数值稳定。"
  - "FA2 优化工作划分，FA3 利用异步与低精度流水线。"
evidence:
  level: "analyzed"
  scope: "基于 FlashAttention-2/3 论文的机制分析；不复述特定 GPU 上的加速倍数。"
  caveats:
    - "实现性能依赖 GPU 架构、tile 大小、head 维度和内核版本。"
sources:
  - title: "FlashAttention-2: Faster Attention with Better Parallelism and Work Partitioning"
    url: "https://arxiv.org/abs/2307.08691"
    authors: "Dao"
    year: 2023
    kind: "paper"
  - title: "FlashAttention-3: Fast and Accurate Attention with Asynchrony and Low-precision"
    url: "https://arxiv.org/abs/2407.08608"
    authors: "Shah et al."
    year: 2024
    kind: "paper"
  - title: "FlashAttention official implementation"
    url: "https://github.com/Dao-AILab/flash-attention"
    publisher: "Dao-AILab"
    year: 2026
    kind: "repository"
lab: "attention-roofline"
related:
  - "llm-agent/frontier/attention-roofline"
  - "llm-agent/frontier/paged-kv-cache"
  - "synthesis/memory-hierarchy"
---

朴素注意力先计算 $S=QK^\top$，再做 softmax，最后乘 $V$。若把 $S$ 完整写回 HBM，再读回来做后续运算，大量时间会消耗在搬运中间结果上。序列越长，$S$ 的规模增长越快。

## Roofline 视角

硬件的工作点由算术强度决定：

$$
I = \frac{\text{FLOPs}}{\text{Bytes}}, \qquad
I_{\text{ridge}} = \frac{\text{Peak FLOP/s}}{\text{Peak Byte/s}}
$$

当 $I < I_{\text{ridge}}$ 时，系统更容易先撞带宽墙。注意力的理想算术强度不低，但朴素实现把中间矩阵反复搬回 HBM，实际带宽需求被放大。

## 分块与在线 softmax

FlashAttention 把 Q、K、V 切成能驻留 SRAM 的 tile，对每个 Q tile 遍历 K/V tile。softmax 的归一化项与最大值在遍历过程中增量更新，因此无需保存完整 $S$。

这要求数值稳定的 online softmax：每次看到新块，更新当前最大值、指数和和输出累加。最终结果与标准注意力相同，只是执行顺序不同。

## FA2 与 FA3

FlashAttention-2 改善了工作划分，减少非矩阵乘操作，并让序列维并行更充分。FlashAttention-3 面向 Hopper，把 TMA、异步 warp 与低精度能力组合起来，让数据搬运、矩阵乘和 softmax 更重叠。

它们优化的是流水线利用率。对不具备相应指令或异步能力的硬件，算法思想仍可借鉴，但不能假设同样收益。

## 什么时候收益有限

序列很短时，完整中间矩阵可能仍能留在缓存中，分块收益下降；自定义 mask、极不规则 head 维度或频繁 kernel 启动也可能抵消收益。共享前缀、长上下文训练和推理是更典型的受益场景。

用 [注意力 Roofline](/lab/attention-roofline/) 比较序列长度与带宽变化。结论应始终写成“在某个硬件和 tile 配置下”，而不是“FlashAttention 永远快几倍”。

## 用 IO 复杂度重写直觉

标准注意力的中间矩阵是 $S \times S$，其中 $S$ 是序列长度。若每个元素占 $b$ 字节，仅保存完整的注意力分数矩阵就需要 $S^2b$ 字节；再加上 softmax 的读写，朴素实现会在 HBM 之间反复搬运大矩阵。FlashAttention 通过 tile 把 Q、K、V 拆成能进入片上 SRAM 的块，在片内完成局部矩阵乘、在线 softmax 归一化和输出累积，避免把完整 $S^2$ 矩阵写回 HBM。

可以把一次分块计算近似写成：

$$
\text{IO}(S) \approx c \cdot S^2 / M
$$

其中 $M$ 是片上可用的 tile 工作集，$c$ 与精度、线程块和读写次数有关。这个式子故意简化了 bank conflict、异步拷贝和掩码，但足够说明：tile 越能复用，HBM 流量越小；序列越长，分块带来的收益越可能抵消额外控制开销。

## 算力不是唯一上限

对一个注意力 kernel，算术强度可以近似为：

$$
I = \frac{\text{FLOPs}}{\text{bytes moved from HBM}}
$$

如果 $I$ 低于硬件的 roofline 拐点，增加峰值 FLOPS 不会让 kernel 变快，先把数据复用做好才有效；如果 $I$ 高于拐点，瓶颈才可能转到矩阵乘吞吐、寄存器压力或调度。这个判断必须使用实际 tile 和实际精度，不能拿模型的理论参数量代替。

以长序列、多个注意力头为例，Q/K/V 的读取和 softmax 中间结果的写回会形成多条竞争带宽的流。FlashAttention-2 的改进不只是“少做操作”，还包括更合理的工作划分和并行映射；FlashAttention-3 利用异步数据搬运与低精度能力，让数据流、矩阵乘和 softmax 更充分地重叠。重叠意味着性能更依赖工程流水线，而不是一个单一公式。

## SRAM 预算与 tile 选择

片上 SRAM 需要同时容纳：

- 一个 Q tile；
- 一个 K tile 与一个 V tile；
- 在线 softmax 的缩放、归一化和累加状态；
- 临时寄存器、转换缓冲和精度转换开销。

tile 太小会增加循环次数和 HBM 读写；tile 太大则放不进 SRAM，或者导致 occupancy 下降。实际实现通常要在序列维、head 维和 batch 维之间分配并行度，并通过 profiler 验证 kernel 的寄存器、共享内存和 occupancy。

这与传统“只要算法复杂度相同，性能就相同”的理解相反。两个实现都可以是精确注意力，但一个把中间结果放回 HBM，另一个在片上完成累积；两个实现的 FLOPs 可能一样，端到端时间却完全不同。

## 精度、掩码和边界情况

低精度可以降低字节数和提高峰值，但也会改变 softmax 数值稳定性。Causal mask、滑动窗口、自定义位置偏置和变长 batch 会让 tile 边界不再规则；实现需要避免把无效位置算进归一化，也要处理尾块。对训练任务，误差还会通过梯度放大；对推理任务，长上下文和低精度组合可能让注意力分布变尖。

因此评估 FlashAttention 时，不能只测空载的注意力 kernel。至少要在完整模型中检查：

1. 相同任务质量是否保持；
2. 预填充和解码两个阶段是否都受益；
3. 自定义 mask 是否触发慢路径；
4. 低精度回退路径是否可用；
5. 多卡并行时通信是否成为新瓶颈。

## 端侧与专用加速器

在边缘 NPU 上，SRAM 更小、DMA 更关键。FlashAttention 的分块思想仍然有价值，但 tile 预算可能只有几百 KiB，甚至要靠 DMA 双缓冲隐藏加载。此时 matmul 峰值并不是主要卖点，权重和 K/V 的搬运、算子融合、定点/低精度支持以及编译器是否能把 mask 融进 kernel 更重要。

如果目标硬件没有成熟的低精度矩阵单元，盲目移植 GPU 版本只会得到一个更复杂的标量循环。反过来，桌面 GPU 上收益明显的 tile 配置，搬到一个共享 SRAM 的许多小核 RISC-V 平台也会失效。算法优化必须和硬件执行模型一起选择。

## 评估清单

- 记录序列长度、head 数、head 维度、batch、精度和 mask 类型。
- 分别测 prefill 与 decode，不把 prefill 吞吐当作解码延迟。
- 报告实际 HBM 读写、SRAM 使用、occupancy 和 kernel 时间。
- 验证长序列、尾块、空 batch 和异常输入的回退路径。
- 论文报告值与本地实测分开标注，不复用不同硬件的加速倍数。

FlashAttention 的真正启发不是“把矩阵乘写得复杂”，而是把**数据移动当作一等公民**。只要一个系统需要反复读取 K/V、写回中间结果，围绕缓存层设计就会比单纯增加计算单元更接近真实瓶颈。

## 用实验验证而不是背诵结论

可以把注意力实验拆成四组：固定序列长度只改变带宽；固定硬件只改变序列长度；改变精度但不改变 tile；改变 mask 类型。每组都记录 kernel 时间、HBM 读写、SRAM 使用和任务质量。只看第一组会得出“带宽越宽越好”的浅结论，只看第二组又会忽略短序列的控制开销。四组放在一起，才能把 roofline 的方向性判断变成可复现的工程证据。

若实验结果与模型预测相反，优先检查三个地方：中间结果是否真的留在片上、编译器是否把低精度转换插在热路径、以及测量是否包含了编译和首次加载。很多“算法没有提升”的案例，根因是数据布局或内核回退，而不是数学本身。最后要把硬件型号、驱动、编译器和批次写入结果，否则同一个加速比无法被别人复核。

训练与推理对注意力的需求也不同。训练通常需要保存中间激活和反向传播所需的张量，分块实现必须与梯度重计算、并行切分和显存规划配合；推理 prefill 偏重吞吐，decode 则常常是小批次、单 token 的延迟敏感路径。把 prefill 的长序列加速比直接套到 decode，会误判线上体验。部署时应分别设置 kernel、批处理和精度策略，并监控两阶段的占比。

还要把精度误差与性能收益一起报告。FP8 或更低位宽会减少 HBM 字节，但可能需要转置、缩放和额外的误差补偿；在某些硬件上，转换开销会把节省的带宽吃回去。一个负责任的对比至少包含 FP16 基线、目标精度、输出质量差异和回退策略。对长上下文任务，低精度误差可能通过 softmax 放大，不能只用短序列 perplexity 判断。

最后，注意实现边界与生态。FlashAttention 的版本、CUDA 工具链、PyTorch 封装和硬件架构彼此耦合；升级其中一个可能改变可用 kernel。团队应固定可复现环境和回归样本，把“使用某个库”改成“在该版本与硬件上通过质量、延迟和显存回归”。这比在文章里追一个孤立的加速数字更有长期价值。

如果团队要从零实现自己的分块注意力，建议先写一个只支持固定长度、无 mask 的教学版本，验证在线 softmax 的归一化是否正确，再加 causal mask 和变长尾块。不要一上来就把异步流水、低精度和分布式切分叠在一起；否则出现数值错误时，很难判断是哪一层优化导致的。先用小矩阵与参考实现做逐元素对比，是比调 benchmark 更可靠的起点。

最后要记住，注意力性能是模型、kernel 和调度器共同的结果。一个优化只在特定头维度上有效，换模型就可能失效；一个提升吞吐的配置可能增加首 token 延迟。把不同层级的结果分开记录，才能避免把局部 kernel 数据误写成产品体验结论。

因此，读者在复现时应先问“这个数字测量的是哪一层”，再决定是否值得为它改造系统。

把版本、硬件、精度和输入形状固定下来后，任何一次新的加速比都应该能追溯到同一套回归记录，这才是可维护的性能工程。

没有回归记录的加速数字，只能算一次演示。

把这句话贴在性能报告首页。

如果要把这一主题做成团队内的性能基准，建议保留“参考实现、FlashAttention-2、目标硬件原生 kernel”三条路径。参考实现验证数学正确性；公开实现验证生态可用性；原生 kernel 验证硬件上限。三者只比较端到端时间会产生误导，必须同时核对输出误差、支持的最大长度和是否发生隐式回退。

性能回归还应按输入 shape 分桶。固定 4K 序列、固定头维度的漂亮结果，无法预测 1K 问答和 32K 文档摘要的体验。把 shape、batch、精度和 mask 组成测试矩阵，在每次升级后重新跑一遍，才能避免某个优化只适用于演示输入。

一份完整的注意力性能复盘应回答：当前工作点位于 roofline 的哪一侧；片外流量由哪几个张量主导；tile 是否受 SRAM 或寄存器限制；精度转换是否在热路径；不同序列长度是否触发不同 kernel；完整模型的首 token 与输出质量是否保持。只要其中一项没有证据，性能结论就还不完整。

把复盘结果整理成短表格并附上失败配置，可以避免团队重复踩同一个坑。性能优化不是追求一张最好看的曲线，而是建立一套能解释变化、能回归、能迁移的证据体系。

最简单的回归做法，是把同一段输入在 CPU 参考实现、目标框架和低精度路径上各跑一次，比较输出误差、显存峰值和延迟。若 CPU 参考实现都无法复现模型论文的误差范围，就不应继续用 GPU 数字讨论算法优劣。

这类小规模交叉验证不能替代完整 benchmark，却能快速排除环境错误。对工程团队来说，稳定的参考路径是后续所有性能结论的地基。

在提交性能方案时，把“目标工作负载、瓶颈判断、验证方法、回退条件”四行写清楚，读者才能判断结论是否适用于自己的系统。
