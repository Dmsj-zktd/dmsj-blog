---
title: "注意力带宽账本：何时算力不是瓶颈"
description: "用算术强度、峰值算力和 HBM 带宽判断注意力工作点，建立可复算的 Roofline 估算。"
date: 2026-10-11
tags: ["Roofline", "FlashAttention", "带宽", "性能模型"]
series: "Signal Lab · LLM 推理"
kind: "experiment"
topic: "hardware-aware-attention"
maturity: "established"
verifiedAt: 2026-10-18
question: "一次注意力运算更可能被计算单元限制，还是被显存带宽限制？"
conclusion: "算术强度与硬件拐点的相对位置决定瓶颈方向。分块执行通过减少 HBM 往返提高有效强度，但具体收益仍需实测。"
takeaways:
  - "Roofline 是量级工具，不是精确性能预测器。"
  - "峰值算力越高，拐点越高，带宽越容易成为限制。"
  - "比较实现时必须固定序列、头数、精度和硬件。"
evidence:
  level: "runnable"
  scope: "本地参数化模型；使用近似 FLOPs 与字节数，不模拟 cache line、bank conflict 或 kernel launch。"
  caveats:
    - "真实内核的 occupancy 和 tile 策略会改变有效吞吐。"
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
lab: "attention-roofline"
related:
  - "llm-agent/frontier/hardware-aware-attention"
  - "synthesis/memory-hierarchy"
---

这个实验把注意力近似成一次 $QK^\top$ 和一次 $AV$ 运算，并用序列长度、头数、头维度、峰值算力与 HBM 带宽估算工作点。

## 估算

近似 FLOPs：

$$
F \approx 4 \times S^2 \times H \times d
$$

若朴素实现把 score 矩阵写回并读回，字节量会随 $S^2H$ 增长。算术强度：

$$
I = F / B
$$

硬件拐点：

$$
I_{\text{ridge}} = \frac{\text{Peak FLOP/s}}{\text{Bandwidth}}
$$

$I$ 低于拐点时，增加峰值算力的收益有限；先减少数据往返更有效。

## 三个观察

1. 序列增长会改变 FLOPs 与字节的相对比例，但实现是否复用 tile 决定真实的 $B$。
2. 更高带宽会降低拐点，使计算侧更容易成为限制；更高峰值算力会抬高拐点，使带宽更紧。
3. 低精度改变字节数，也改变硬件峰值，不能只改一个变量。

打开 [注意力 Roofline](/lab/attention-roofline/) 改变带宽和序列长度。把输出写入性能记录时，至少附上硬件、精度、序列与内核版本。

这个模型故意忽略缓存命中、SRAM 容量和调度开销。它的用途是排除明显错误的方向，而不是替代 Nsight 或硬件计数器。

## 计算过程与单位

实验把一次注意力的工作近似为 $QK^\top$ 和 $AV$ 两次矩阵乘。对长度 $S$、头数 $H$、头维度 $d$ 的序列，FLOPs 量级可以写成：

$$
\text{FLOPs} \approx 4 S^2 H d
$$

而一次朴素的 HBM 往返会读取 Q、K、V 和写回较大的中间结果。实验用 $4SHdb$ 作为字节量级，其中 $b$ 是每个元素的字节数。两者相除得到算术强度：

$$
I = \frac{\text{FLOPs}}{\text{bytes}} \approx \frac{S}{b}
$$

真实实现还会加入 softmax、缩放、mask、写回和 tile 边界，因此这里的 $I$ 只用于判断方向，而不是精确预测 kernel 时间。roofline 拐点为：

$$
I_{\text{roof}} = \frac{\text{peak FLOPS}}{\text{peak bandwidth}}
$$

当 $I < I_{\text{roof}}$ 时，工作点位于带宽侧；当 $I > I_{\text{roof}}$ 时，峰值算力才可能成为主要限制。这个判断与序列长度、精度、硬件带宽和 tile 复用同时相关。

## 如何解读实验输出

页面中的“估算 HBM 往返”不是优化后 FlashAttention 的流量，而是用来提醒读者朴素路径的中间矩阵有多大。真实 FlashAttention 通过片上 tile 复用减少了这部分流量，所以页面显示的是一个上界或方向性对照，不应把它直接当作 FlashAttention 的实测带宽。

改变一个参数时，最好预测变化方向后再看结果：

- 序列长度增长：FLOPs 按平方增长，理论上限和中间矩阵压力上升；
- 峰值算力提高：拐点提高，更多工作点落入带宽侧；
- 带宽提高：拐点下降，计算侧更容易成为限制；
- 元素字节减少：同样 token 的流量降低，但低精度峰值和误差也会变。

## 失败边界

短序列、强 mask、小 batch 和频繁 kernel 启动会让分块控制开销占比上升。某些加速器没有足够 SRAM 或异步拷贝能力，tile 太小导致循环和同步过多。把 roofline 模型当作“是否应该使用 FlashAttention”的唯一标准，也会忽视数值误差、算子覆盖和编译工具链。

一个稳妥的验证顺序是：先用模型判断瓶颈方向，再用 Nsight/trace 获取 HBM 与 SM 利用率，最后在完整模型上测端到端延迟和质量。只有三者一致时，才把某个优化写成可复用的工程结论。

## 一个题目的三种答案

面对“为什么开启 FlashAttention 后没有变快”，可以从三个层次回答。算法层：tile 是否足够容纳 Q/K/V 工作集，是否真的避免了中间矩阵写回；实现层：kernel 是否发生回退、是否被 mask 或变长 batch 打散、寄存器占用是否降低 occupancy；系统层：HBM 是否仍被其他算子占满，batch 太小是否无法填满并行单元。三者只查一层，很容易把实现问题误判为算法无效。

把实验参数写成可复现的配置，例如“S=4096、H=32、d=128、FP16、带宽 900 GB/s、峰值 60 TFLOPS”，再报告模型估算和实测的差异。若差异很大，不要强行解释成同一条曲线，而要记录缺失的变量：cache 命中、tile 大小、编译选项和 kernel 版本。工程结论的可靠性，来自知道模型何时不适用。

对于跨硬件比较，最好固定的是问题规模和精度，而不是某一张卡的 tile 选择。不同 SRAM 与寄存器数量会要求不同 tile；强行使用相同配置，会让比较变成实现适配性测试。实验页因此只用于建立方向性直觉，最终选择要由目标平台的 profiler 决定。

如果在浏览器里改变参数后发现结果与直觉不符，先检查单位：TFLOPS 是每秒万亿次运算，GB/s 是每秒十亿字节，两者的比值单位是 FLOP/B。把 1 字节与 1 bit 混淆，或把 GB 与 GiB 混用，会让算术强度出现数量级偏差。量级模型的第一价值是避免这种单位错误。

另一项常见误判是把峰值带宽当作有效带宽。真实 kernel 的有效带宽会受并发、访问模式、cache 和 ECC 影响，roofline 的横轴应使用测量值而非宣传峰值。把模型结论写成假设区间，比写成单一数字更接近工程现实。

若要把实验分享给同事，附上输入参数截图与一条手算结果，可以显著降低复现歧义。

一个清楚的 roofline 假设表，比一个没有条件的“某算法快几倍”结论更值得在工程评审中传播。

因此，实验页最适合用来训练提问：瓶颈在带宽还是计算？中间结果是否必须写回？tile 是否能放进片上存储？当这些问题被逐项回答，性能优化就从猜参数变成了可验证的设计过程。

对每一次实验，至少保存一个“为什么会这样”的解释，避免只留下结果截图。

没有解释的参数扫描只是在制造数字噪声，也无法指导下一次设计。

把假设和解法一起写下来，才是可以积累的性能知识。
