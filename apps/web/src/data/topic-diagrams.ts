export interface TopicDiagram {
  id: string;
  title: string;
  caption: string;
  stages: Array<{ label: string; detail: string; tone?: "ai" | "embedded" | "neutral" }>;
}

export const topicDiagrams: Record<string, TopicDiagram> = {
  "paged-kv-cache": {
    id: "paged-kv-cache",
    title: "逻辑上下文如何落到物理 KV 块",
    caption: "分页把连续上下文需求与物理显存分配解耦，收益由请求长度分布和块大小共同决定。",
    stages: [
      { label: "请求", detail: "token 序列", tone: "ai" },
      { label: "逻辑块", detail: "连续编号", tone: "ai" },
      { label: "块表", detail: "映射物理页", tone: "neutral" },
      { label: "KV 页", detail: "非连续分配", tone: "embedded" },
      { label: "调度器", detail: "共享与回收", tone: "embedded" },
    ],
  },
  "hardware-aware-attention": {
    id: "hardware-aware-attention",
    title: "注意力的数据路径与片上复用",
    caption: "算法把 Q/K/V 分块搬入 SRAM，在线 softmax 避免写回完整注意力矩阵。",
    stages: [
      { label: "HBM", detail: "Q / K / V", tone: "embedded" },
      { label: "Tile", detail: "分块读取", tone: "neutral" },
      { label: "SRAM", detail: "块内复用", tone: "ai" },
      { label: "Online softmax", detail: "增量归一化", tone: "ai" },
      { label: "O", detail: "一次写回", tone: "embedded" },
    ],
  },
  "inference-time-compute": {
    id: "inference-time-compute",
    title: "推理预算如何转化为可靠答案",
    caption: "采样、验证与停止策略组成预算分配器；验证器的误差会直接限制最终收益。",
    stages: [
      { label: "任务", detail: "可验证性判断", tone: "ai" },
      { label: "策略", detail: "思考或采样", tone: "ai" },
      { label: "候选", detail: "N 条推理轨迹", tone: "neutral" },
      { label: "验证", detail: "排序与筛选", tone: "embedded" },
      { label: "停止", detail: "预算与置信", tone: "embedded" },
    ],
  },
  "mcp-trust-boundary": {
    id: "mcp-trust-boundary",
    title: "一次工具调用跨过哪些信任边界",
    caption: "模型输出跨入执行域后，最小权限、幂等、沙箱和审计必须一起成立。",
    stages: [
      { label: "用户意图", detail: "不可信输入", tone: "neutral" },
      { label: "模型计划", detail: "概率输出", tone: "ai" },
      { label: "MCP 客户端", detail: "能力与授权", tone: "ai" },
      { label: "工具服务", detail: "真实副作用", tone: "embedded" },
      { label: "审计 / 回滚", detail: "可恢复性", tone: "embedded" },
    ],
  },
  "sparse-moe": {
    id: "sparse-moe",
    title: "稀疏路由留下了什么成本",
    caption: "专家激活降低矩阵乘工作量，但全部专家、缓存热点与通信仍构成部署成本。",
    stages: [
      { label: "Token", detail: "批内请求", tone: "ai" },
      { label: "Router", detail: "Top-k 选择", tone: "ai" },
      { label: "专家", detail: "稀疏计算", tone: "neutral" },
      { label: "合并", detail: "权重求和", tone: "embedded" },
      { label: "缓存 / 通信", detail: "尾延迟来源", tone: "embedded" },
    ],
  },
  "edge-small-models": {
    id: "edge-small-models",
    title: "一个端侧 token 的内存旅程",
    caption: "权重、激活、KV 与运行时共同争用 SRAM，任何一个被忽略都可能让模型装不进去。",
    stages: [
      { label: "Flash", detail: "量化权重", tone: "embedded" },
      { label: "SRAM", detail: "权重驻留", tone: "ai" },
      { label: "Activation", detail: "峰值工作区", tone: "ai" },
      { label: "KV", detail: "上下文增长", tone: "neutral" },
      { label: "MCU", detail: "实时约束", tone: "embedded" },
    ],
  },
  "riscv-ai-accelerators": {
    id: "riscv-ai-accelerators",
    title: "RISC-V 数据流：算力、带宽与软件栈",
    caption: "开放 ISA 不自动产生高性能；向量、NPU 与共享内存需要同一条可编译的数据路径。",
    stages: [
      { label: "RVA23", detail: "软件基线", tone: "ai" },
      { label: "向量 / NPU", detail: "并行计算", tone: "ai" },
      { label: "共享 SRAM", detail: "数据复用", tone: "neutral" },
      { label: "DMA", detail: "搬运流水线", tone: "embedded" },
      { label: "DDR", detail: "带宽墙", tone: "embedded" },
    ],
  },
  "chiplet-edge-ai": {
    id: "chiplet-edge-ai",
    title: "Chiplet 把复杂度推到了互连",
    caption: "模块化复用的收益必须扣除 D2D 带宽、传输能耗、封装与热设计成本。",
    stages: [
      { label: "计算 Die", detail: "AI 加速", tone: "ai" },
      { label: "UCIe", detail: "D2D 链路", tone: "neutral" },
      { label: "存储 Die", detail: "高带宽内存", tone: "embedded" },
      { label: "封装", detail: "良率与热", tone: "embedded" },
      { label: "边缘系统", detail: "功耗预算", tone: "ai" },
    ],
  },
  "compute-in-memory": {
    id: "compute-in-memory",
    title: "存算一体不是“把 MAC 移进阵列”就结束",
    caption: "模拟域阵列之后仍有 ADC、外围控制、索引和同步，稀疏收益取决于整条链。",
    stages: [
      { label: "权重", detail: "驻留阵列", tone: "embedded" },
      { label: "模拟 MAC", detail: "交叉阵列", tone: "ai" },
      { label: "ADC", detail: "量化与噪声", tone: "neutral" },
      { label: "外围控制", detail: "索引与同步", tone: "embedded" },
      { label: "有效能效", detail: "整链路核算", tone: "ai" },
    ],
  },
  "trusted-embedded-stack": {
    id: "trusted-embedded-stack",
    title: "安全操作也必须满足截止期",
    caption: "内存安全、密码学与实时调度共享同一组 CPU 周期、栈和功耗预算。",
    stages: [
      { label: "Rust 边界", detail: "内存安全", tone: "ai" },
      { label: "PQC", detail: "签名 / 验证", tone: "neutral" },
      { label: "RTOS", detail: "优先级调度", tone: "embedded" },
      { label: "截止期", detail: "最坏响应", tone: "embedded" },
      { label: "审计", detail: "可恢复性", tone: "ai" },
    ],
  },
};
