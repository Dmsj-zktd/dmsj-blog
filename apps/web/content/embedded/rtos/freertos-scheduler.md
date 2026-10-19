---
title: "FreeRTOS 调度器笔记：tick、抢占与优先级反转"
description: "从一次任务延迟异常反推 FreeRTOS 的调度、阻塞和优先级继承机制。"
date: 2026-07-18
updated: 2026-10-18
tags: ["FreeRTOS", "RTOS", "调度", "调试"]
series: "嵌入式调度与并发"
lang: "zh-CN"
draft: false
featured: true
kind: "note"
maturity: "established"
verifiedAt: 2026-10-18
evidence:
  level: "analyzed"
  scope: "基于 FreeRTOS 官方文档与典型 Cortex-M 移植行为分析；具体异常表现取决于内核配置、移植层和断言设置。"
  caveats:
    - "不同 FreeRTOS 版本和 configASSERT 配置可能改变错误被发现的时机。"
    - "本文没有给出目标板实测响应时间，结论用于指导排障方向。"
sources:
  - title: "FreeRTOS RTOS fundamentals"
    url: "https://www.freertos.org/RTOS.html"
    authors: "FreeRTOS"
    year: 2026
    kind: "documentation"
  - title: "FreeRTOS mutexes and priority inheritance"
    url: "https://www.freertos.org/Documentation/02-Kernel/01-About-the-FreeRTOS-kernel/01-FreeRTOS-kernel"
    authors: "FreeRTOS"
    year: 2026
    kind: "documentation"
  - title: "FreeRTOS kernel source"
    url: "https://github.com/FreeRTOS/FreeRTOS-Kernel"
    authors: "FreeRTOS"
    kind: "repository"
---

做嵌入式系统时，“高优先级任务为什么没有及时运行”是比“会不会背 API”更能区分工程能力的问题。下面用一个常见的延迟异常，把 tick、抢占、阻塞和优先级继承放在同一条因果链里。

## 现场：高优先级任务等得比预期久

假设三个任务：

- `SensorTask` 优先级最高，拿到互斥量后读取共享总线；
- `LoggerTask` 优先级较低，偶尔长时间持有同一把互斥量；
- `ControlTask` 优先级居中，周期性就绪。

现象是 `SensorTask` 偶尔错过截止期，而 CPU 利用率看起来并没有接近 100%。如果只看任务自己打印的日志，很容易误判为“中断丢了”或“tick 变慢”。

更可能的解释是**优先级反转**：`LoggerTask` 持有互斥量时被 `ControlTask` 抢占，导致 `SensorTask` 继续等待低优先级任务释放资源。等待时间由低优先级任务被抢占的时间决定，而不是由 `SensorTask` 自身的执行时间决定。

## Tick 不是调度器本身

SysTick 提供周期性的时间基准。Cortex-M 移植通常会在 SysTick 中断中推进 tick 计数，并在需要时通过 PendSV 请求上下文切换：

```c
void SysTick_Handler(void)
{
    if (xTaskIncrementTick() != pdFALSE) {
        portYIELD_FROM_ISR(pdTRUE);
    }
}
```

Tick 负责“时间前进”和超时判断，真正选择下一个任务的是调度器。对抢占式调度，最高优先级的就绪任务应当运行；同优先级任务通常按时间片轮转。

还需要注意：

- `configUSE_PREEMPTION` 与 `configUSE_TIME_SLICING` 会改变调度行为；
- 中断优先级配置错误可能让 PendSV 或 SysTick 无法按预期嵌套；
- tick 是离散时间，`vTaskDelay(1)` 通常表示“至少等到下一个 tick 边界”，并不等于精确的一毫秒；
- 高优先级任务如果忙等，低优先级任务依然得不到 CPU，这不是调度器失效。

## 阻塞 API 和临界区要分开理解

临界区通常通过进入/退出宏保护共享数据，期间可能屏蔽部分中断或禁止调度，因此应尽量短。**在临界区中调用可能阻塞的 API 会破坏设计假设**；错误的具体表现取决于内核版本、移植和 `configASSERT`，不应把它简化成某一种固定故障，更不能把它当作优先级反转的标准解释。

排查时先记录这些证据：

1. 任务优先级、状态和等待对象；
2. 互斥量的持有者与等待者；
3. 中断屏蔽的最长区间；
4. 任务切换时间线和队列/信号量事件；
5. 每个任务的 WCET 和关键区执行时间。

## 互斥量不是二值信号量的别名

FreeRTOS 互斥量支持优先级继承。持锁的低优先级任务在其他任务等待该互斥量时，可以临时提升到等待者的优先级，减少被中间优先级任务无限插队的窗口。

| 机制 | 二值信号量 | 互斥量 |
| --- | --- | --- |
| 优先级继承 | 默认没有 | 有 |
| 递归获取 | 不适用 | 可创建递归互斥量 |
| 典型用途 | 任务/中断同步 | 保护共享资源 |
| 错误处理 | 需要自行定义 | 支持删除/超时等路径 |

优先级继承不是万能药。它不能消除持锁时间，也不能修复死锁、递归使用普通互斥量或在中断里错误调用非 ISR API 等问题。

## 把排障变成可验证流程

我最终采用的最小流程是：

1. 用 trace 记录任务状态和互斥量事件，而不是只按日志时间顺序猜；
2. 检查所有阻塞 API 是否出现在临界区或中断上下文；
3. 对共享总线访问测量最坏持锁时间；
4. 将保护资源的二值信号量替换为互斥量，并设置合理超时；
5. 用高于目标负载的压测和 72 小时老化测试验证尾延迟，而不是只看平均值。

真正值得带走的不是“某个 API 不能用”，而是这条推理链：**调度策略定义谁应该运行，阻塞关系决定谁实际能运行，资源所有权决定高优先级任务会被谁拖住。**
