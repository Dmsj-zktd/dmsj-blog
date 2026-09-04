---
title: "把 Agent 工具循环调稳：一次『循环卡死』的工程复盘"
description: "从超时、幂等、结构化输出三个维度整理多轮工具调用的工程化要点。"
date: 2026-08-26
tags: ["Agent", "工具调用", "可靠性"]
series: "LLM 应用工程笔记"
lang: "zh-CN"
draft: false
featured: true
---

Demo 里 Agent 调用工具很顺，一到生产就出现“无限重试”“重复副作用”“解析失败”。这篇是我把工具循环拆开后的三个工程结论。

## 循环必须有限且有界

工具调用本质是一个 `while` 循环：模型输出工具请求 → 执行 → 把结果送回上下文。生产环境必须显式声明：

```ts
interface ToolLoopConfig {
  maxSteps: number; // 例如 12
  perToolTimeoutMs: number;
  totalTimeoutMs: number;
}
```

超时不是兜底，而是**协议的一部分**。模型/工具没有响应时限时，任何上层监控都无法区分“慢”和“死”。

## 工具要幂等，副作用要登记

一个失败的写入工具被重试两次，就会产生两笔副作用。我的做法：

1. 每个外部副作用工具必须接收幂等键；
2. 执行层维护 `execution_id -> effect_status`；
3. 重试前先查询同一幂等键的执行结果。

```ts
async function runTool(call: ToolCall): Promise<ToolResult> {
  const prior = await effectStore.get(call.idempotencyKey);
  if (prior) return prior;
  const result = await dispatch(call);
  await effectStore.put(call.idempotencyKey, result);
  return result;
}
```

## 结构化输出比提示词更可靠

早期版本靠自然语言让模型“尽量输出 JSON”，解析层写了大量兼容代码。后来改用 JSON Schema 强制输出，并用校验器做重试信号：

- 解析失败 → 把错误原文与 schema 送回模型；
- 重试仍失败 → 终止循环并记录失败样本；
- 失败样本进入评测集，下次迭代有据可依。

| 控制点 | 常见错误 | 工程解法 |
| --- | --- | --- |
| 输入 | 恶意/超大上下文 | 白名单 + token 预算 |
| 执行 | 外部依赖超时 | 独立超时 + 熔断 |
| 输出 | JSON 不合法 | schema + validator |

## 小结

Agent 稳定的关键不是“更强的模型”，而是把不确定的模型输出放进**确定性的工程边界**：步数、时间、幂等、校验、可观测。
