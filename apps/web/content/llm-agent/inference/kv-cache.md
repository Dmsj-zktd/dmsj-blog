---
title: "KV Cache 为什么能加速推理？一个自注意力视角"
description: "从 Transformer 自注意力公式推导 KV Cache 的保存对象与显存权衡。"
date: 2026-09-02
tags: ["LLM", "推理优化", "Transformer"]
lang: "zh-CN"
draft: false
series: "Signal Lab · 推理基础"
kind: "note"
maturity: "established"
verifiedAt: 2026-10-18
question: "KV Cache 保存了什么，为什么现代模型还需要 GQA 和分页管理？"
conclusion: "KV Cache 用显存保存历史 K/V，避免每步重算；缓存大小由层数、KV heads、头维度、上下文和精度共同决定。"
takeaways:
  - "生成阶段只需计算当前 token 的 Q，并复用历史 K/V。"
  - "缓存公式必须使用 KV heads，而不是注意力头总数。"
  - "GQA 与分页分别降低字节数和分配浪费，解决的是不同问题。"
evidence:
  level: "analyzed"
  scope: "公式推导与公开模型机制分析，不包含特定硬件实测。"
sources:
  - title: "Efficient Memory Management for Large Language Model Serving with PagedAttention"
    url: "https://arxiv.org/abs/2309.06180"
    authors: "Kwon et al."
    year: 2023
    kind: "paper"
lab: "kv-budget"
related:
  - "llm-agent/frontier/paged-kv-cache"
  - "llm-agent/frontier/kv-cache-budget"
---

解码阶段逐 token 生成，但每个 token 都要“重新看一遍历史”吗？KV Cache 的答案：历史 token 的 Key/Value 计算结果不需要重算。

## 自注意力的计算切分

对位置 $t$ 的查询向量，注意力输出是：

$$
\text{attn}_t = \text{softmax}\!\left(\frac{q_t K_{\le t}^{\top}}{\sqrt{d_k}}\right) V_{\le t}
$$

其中 $K_{\le t}$ 和 $V_{\le t}$ 由历史 token 线性投影得到。若没有缓存，每生成一个新 token 都要对全部历史重新做矩阵乘法。

## 缓存了什么

推理框架保存的是每一层的 K、V 张量，而不是原始 hidden state：

| 张量 | 随 token 变化 | 生成时重算 |
| --- | --- | --- |
| Q | 每次新 | 是 |
| K/V（历史） | 追加 | 否 |
| W_q/W_k/W_v | 固定 | 否 |

## 显存权衡

缓存需要显存。每个 token 的缓存字节数可以写成：

$$
\text{KV bytes per token} = 2 \times L \times H_{\text{kv}} \times d_{\text{head}} \times b
$$

其中 $L$ 是层数，$H_{\text{kv}}$ 是 KV heads 数量，$d_{\text{head}}$ 是头维度，$b$ 是每个元素的字节数。这里不能用 $d_{model}$ 或注意力头总数替代 KV heads。GQA/MQA 会减少 $H_{\text{kv}}$，从而直接降低每个 token 的缓存。

所以 7B 模型在长上下文、高并发下，KV Cache 可能比权重更占显存。GQA 降低缓存字节数；PagedAttention 降低分配碎片并支持共享；sliding window 则裁剪可见历史。三者解决的是不同层面的问题，不能互相替代。

## 面试可用的一句话

“KV Cache 是在时间维上做动态规划：每步只需计算当前 token 的 Q 与历史 K/V 的点积，代价是把历史 K/V 显式存下来。”

这句话同时证明你懂公式、懂显存、懂为什么现代架构要改注意力头结构。
