---
title: "FreeRTOS 调度器笔记：tick、抢占与优先级反转"
description: "从一次任务卡死现场反推 FreeRTOS 调度的三个关键机制。"
date: 2026-07-18
updated: 2026-08-30
tags: ["FreeRTOS", "RTOS", "调度", "调试"]
series: "嵌入式调度与并发"
lang: "zh-CN"
draft: false
featured: true
---

做嵌入式面试时，“RTOS 调度器怎么跑起来”是区分背概念与真理解的高频问题。我以一次真实排障为线索，整理 FreeRTOS 调度相关的关键机制。

## 现场：低优先级任务饿死高优先级任务

现象：任务 A（高优先级，等信号量）长期得不到执行；任务 B（低优先级）占用 CPU，日志显示 B 每次都主动 `vTaskDelay(1)`。

第一反应是优先级配置写反了，核对 `configMAX_PRIORITIES` 与 `uxPriority` 都正确。继续查才发现：**B 在临界区内调用 `vTaskDelay`**。

## Tick 与抢占

FreeRTOS 的抢占发生在：

- SysTick 中断退出前调用 `portYIELD_FROM_ISR`；
- 任何导致当前任务阻塞的 API 内部执行任务切换。

```c
// 简化版调度判断：就绪最高优先级
pxCurrentTCB = listGET_OWNER_OF_HEAD_ENTRY(
    &( pxReadyTasksLists[ uxTopReadyPriority ] ) );
```

如果任务在临界区（中断被屏蔽）里调用阻塞 API，调度器无法立刻切换；更危险的是某些实现里阻塞发生在临界区会导致 `vTaskDelay` 的行为与预期完全不同。

## 优先级反转与互斥量的继承

用二值信号量保护共享资源时，低优先级任务持有锁会让高优先级任务等待。FreeRTOS 的互斥量（`xSemaphoreCreateMutex`）实现了**优先级继承**：持锁的低优先级任务临时提升到等待者优先级，降低反转窗口。

| 机制 | 信号量 | 互斥量 |
| --- | --- | --- |
| 优先级继承 | 无 | 有 |
| 递归获取 | 无 | 支持 `xSemaphoreCreateRecursiveMutex` |
| 典型用途 | 事件通知/计数 | 资源互斥 |

## 排查步骤沉淀

1. 在可疑任务的 API 前后加时间戳与 `uxTaskGetSystemState` 快照；
2. 检查所有阻塞调用是否在临界区/中断上下文；
3. 用 `trace` 工具看就绪队列形态，而不是只盯日志顺序；
4. 修好后做 72 小时老化测试，并保留现场触发条件。

最终修复是去掉临界区内的延时，并把资源锁从二值信号量换成互斥量。这个 case 后来也被我写成了面试题：**“如何证明你的调度分析，而不是猜？”**
