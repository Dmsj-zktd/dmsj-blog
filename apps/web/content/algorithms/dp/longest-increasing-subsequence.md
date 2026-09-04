---
title: "从 O(n²) 到 O(n log n)：最长递增子序列的两种推导"
description: "用状态转移视角推导 LIS，并解释贪心 + 二分为何能得到长度最优解。"
date: 2026-08-12
tags: ["动态规划", "二分查找", "面试"]
series: "面试高频 DP 复盘"
lang: "zh-CN"
draft: false
featured: true
---

最长递增子序列（Longest Increasing Subsequence, LIS）是面试里“一个结论能用一整类题”的典型。难点不在背代码，而在把两种解法之间的模型关系讲清楚。

## 定义与样例

给定数组 `nums`，求严格递增子序列的最长长度。注意“子序列”不要求连续。

样例：

```text
nums = [10, 9, 2, 5, 3, 7, 101, 18]
答案 = 4  （[2, 3, 7, 101] 或 [2, 3, 7, 18]）
```

## 解法一：以 i 结尾的 DP

设 $f(i)$ 表示“以 `nums[i]` 结尾的 LIS 长度”。转移时枚举前面的 `j`：

$$
f(i) = 1 + \max_{\substack{j < i \\ nums[j] < nums[i]}} f(j)
$$

复杂度 $O(n^2)$。这个版本的价值在于“状态定义”正确：**子序列的结尾是谁**，而不是“当前走到哪”。面试追问优化时，通常从朴素 DP 出发解释，而不是直接甩出二分版本。

## 解法二：贪心 + 二分

维护数组 `tails`：`tails[k]` 表示“长度为 k+1 的递增子序列中，可能的最小结尾”。

对每个 `x`：

1. 如果 `x > tails` 中最后一个元素，追加；
2. 否则用二分找到第一个 `>= x` 的位置并替换。

```ts
function lengthOfLIS(nums: number[]): number {
  const tails: number[] = [];
  for (const x of nums) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tails[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    tails[lo] = x;
  }
  return tails.length;
}
```

这里最容易讲错的一点：**`tails` 不一定是真实子序列**。它只保证“长度正确”，替换操作是为了把“未来更大长度”的门槛降得更低。

## 与“最长上升子序列变体”的联系

| 变体 | 关键差异 | 解法 |
| --- | --- | --- |
| 严格递增 | 允许相等替换 | 二分找第一个 `>= x` |
| 非严格递增 | 相等可接 | 二分找第一个 `> x` |
| 求具体方案 | 需要还原 | 额外记录 `parent` |

## 小结

面试作答时先给 $O(n^2)$ 的转移方程，再说明优化点：“转移只在找最大值，而这个最大值可以用单调性维护”。一个公式、一段代码、一个反直觉结论，足够覆盖大多数追问。
