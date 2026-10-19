---
title: "峰值索引：二分不是只能搜有序数组"
description: "用『局部单调性』重新理解二分，并给出可推导的边界写法。"
date: 2026-08-21
tags: ["二分查找", "数组", "边界"]
lang: "zh-CN"
draft: false
kind: "note"
maturity: "established"
verifiedAt: 2026-10-18
question: "二分查找是否必须依赖全局有序？"
conclusion: "只要存在一个可证明的单调性谓词，能把候选区间稳定缩小一半，就可以使用二分。"
takeaways:
  - "峰值题的谓词是相邻元素方向。"
  - "闭区间的移动规则必须与不变量一致。"
  - "先证明答案不会被丢掉，再写 mid 和边界。"
evidence:
  level: "analyzed"
  scope: "算法推导与可复现代码分析。"
---

LeetCode 162 的经典误导在于：很多人认为二分必须建立在“全局有序”上。其实只要**每次能把候选区间可靠地缩减一半**，二分就成立。

## 题目直觉

数组满足 `nums[i] != nums[i+1]`，任意相邻不相等。峰值定义为 `nums[i] > nums[i+1]` 且 `nums[i] > nums[i-1]`（边界只需一侧成立）。

关键观察：取中点 `mid`：

- 若 `nums[mid] < nums[mid + 1]`，说明中点右侧存在一个上升趋势，峰一定在右侧；
- 反之峰在左侧（含 `mid`）。

```ts
function findPeakIndex(nums: number[]): number {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo < hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (nums[mid] < nums[mid + 1]) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
```

## 为什么不会丢掉答案

想象一段连续的山坡：上升段结束的地方一定存在峰。二分的每一步都保证当前区间内仍包含至少一个峰，因此循环结束时 `lo` 是合法的峰值下标。

## 边界记忆法

写二分最怕 `mid`、`lo`、`hi` 三个值互相打架。稳定的写法是把区间视为 `[lo, hi]` 闭区间，并只在条件**完全确定**时移动：

| 观察 | 动作 |
| --- | --- |
| 右侧存在上升趋势 | `lo = mid + 1`（`mid` 一定不是答案） |
| 左侧包含峰 | `hi = mid`（`mid` 可能是答案） |

这类“局部单调”思想同样适用于旋转数组找最小值、找任意局部极小值等题目。

验证时建议构造长度为 1、严格递增、严格递减和交替峰值的数组，并断言返回值在边界上仍满足峰值定义。
