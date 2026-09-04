---
title: "KV Cache 为什么能加速推理？一个自注意力视角"
description: "从 Transformer 自注意力公式推导 KV Cache 的保存对象与显存权衡。"
date: 2026-09-02
tags: ["LLM", "推理优化", "Transformer"]
lang: "zh-CN"
draft: false
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

缓存需要显存。近似公式：

$$
\text{KV bytes per token} \approx 2 \times \text{layers} \times 2 \times d_{model} \times \text{bytes}
$$

所以 7B 模型在长上下文下，KV Cache 可能比权重更占显存。这也是 GQA（Grouped-Query Attention）与 sliding window 被提出的直接原因：**把“K/V 副本”砍掉或裁剪，以少量质量损失换长上下文成本下降**。

## 面试可用的一句话

“KV Cache 是在时间维上做动态规划：每步只需计算当前 token 的 Q 与历史 K/V 的点积，代价是把历史 K/V 显式存下来。”

这句话同时证明你懂公式、懂显存、懂为什么现代架构要改注意力头结构。
