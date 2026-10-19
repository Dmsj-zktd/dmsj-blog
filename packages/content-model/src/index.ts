import { z } from "zod";

export const DOMAIN_KEYS = [
  "algorithms",
  "embedded",
  "llm-agent",
  "projects",
  "thoughts",
  "synthesis",
] as const;

export type DomainKey = (typeof DOMAIN_KEYS)[number];

export interface ContentDomain {
  key: DomainKey;
  label: string;
  shortLabel: string;
  description: string;
  order: number;
  inNav: boolean;
  public: boolean;
}

export const contentDomains: ContentDomain[] = [
  {
    key: "algorithms",
    label: "算法心得",
    shortLabel: "算法",
    description: "数据结构、复杂度与算法题的工程化理解，重推导与可复现。",
    order: 1,
    inNav: true,
    public: true,
  },
  {
    key: "embedded",
    label: "嵌入式经验",
    shortLabel: "嵌入式",
    description: "MCU、RTOS、驱动、边缘 AI 与芯片系统的底层工程实践。",
    order: 2,
    inNav: true,
    public: true,
  },
  {
    key: "llm-agent",
    label: "LLM / Agent",
    shortLabel: "LLM/Agent",
    description: "模型推理、工具调用、Agent 架构与评测的可验证研究。",
    order: 3,
    inNav: true,
    public: true,
  },
  {
    key: "projects",
    label: "项目展示",
    shortLabel: "项目",
    description: "把做过的东西讲清楚：目标、权衡、实现与可复现结果。",
    order: 4,
    inNav: true,
    public: true,
  },
  {
    key: "thoughts",
    label: "研究随笔",
    shortLabel: "随笔",
    description: "跨领域方法论、技术路线判断与工程思考。",
    order: 5,
    inNav: true,
    public: true,
  },
  {
    key: "synthesis",
    label: "综合研究",
    shortLabel: "综合",
    description: "跨域融合：把不同论文与系统约束放进同一条工程主线。",
    order: 6,
    inNav: false,
    public: true,
  },
];

export const CONTENT_DOMAINS = DOMAIN_KEYS;
export const contentDomainSchema = z.enum(DOMAIN_KEYS);

export function isDomainKey(value: string): value is DomainKey {
  return DOMAIN_KEYS.includes(value as DomainKey);
}

export const CONTENT_KINDS = [
  "note",
  "lab",
  "synthesis",
  "essay",
  "project",
  "flagship",
  "experiment",
] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];
export const contentKindSchema = z.enum(CONTENT_KINDS);

export const MATURITY_LEVELS = ["emerging", "established", "experimental"] as const;
export type Maturity = (typeof MATURITY_LEVELS)[number];
export const maturitySchema = z.enum(MATURITY_LEVELS);

export const EVIDENCE_LEVELS = ["analyzed", "runnable", "reproduced"] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];
export const evidenceLevelSchema = z.enum(EVIDENCE_LEVELS);

export const EvidenceSchema = z.preprocess(
  (value) => {
    if (typeof value === "string") return { level: value };
    return value;
  },
  z.object({
    level: evidenceLevelSchema,
    basis: z.string().trim().max(240).optional(),
    scope: z.string().trim().max(400).optional(),
    caveats: z.array(z.string().trim().min(1).max(300)).max(8).default([]),
  }),
);
export type Evidence = z.infer<typeof EvidenceSchema>;

export const AUDIENCE_LENSES = ["builder", "hiring", "explorer"] as const;
export type AudienceLens = (typeof AUDIENCE_LENSES)[number];
export const audienceLensSchema = z.enum(AUDIENCE_LENSES);
export const DEFAULT_AUDIENCE_LENS: AudienceLens = "builder";

export function parseAudienceLens(value: unknown): AudienceLens {
  return audienceLensSchema.safeParse(value).success ? (value as AudienceLens) : DEFAULT_AUDIENCE_LENS;
}

export const LAB_KINDS = [
  "kv-budget",
  "attention-roofline",
  "reasoning-budget",
  "tool-loop",
  "moe-routing",
  "tinyml-budget",
  "riscv-roofline",
  "chiplet-budget",
  "sparsity-energy",
  "trust-budget",
] as const;

export type LabKind = (typeof LAB_KINDS)[number];
export const labKindSchema = z.enum(LAB_KINDS);

export const LAB_TITLES: Record<LabKind, string> = {
  "kv-budget": "KV Cache 容量与分页浪费",
  "attention-roofline": "注意力 IO 屋顶线",
  "reasoning-budget": "推理预算分配器",
  "tool-loop": "Agent 工具环风险",
  "moe-routing": "MoE 激活与路由热区",
  "tinyml-budget": "端侧内存预算",
  "riscv-roofline": "RISC-V 数据移动流水线",
  "chiplet-budget": "Chiplet 带宽与能耗账本",
  "sparsity-energy": "稀疏度与存算能耗",
  "trust-budget": "RTOS 可调度性与安全开销",
};

export const LAB_KIND_ALIASES: Record<string, LabKind> = {
  "kv-capacity": "kv-budget",
  "agent-reliability": "tool-loop",
  "edge-memory": "tinyml-budget",
  "riscv-dataflow": "riscv-roofline",
  "chiplet-bandwidth": "chiplet-budget",
  "cim-sparsity": "sparsity-energy",
  "pqc-ledger": "trust-budget",
};

export function normalizeLabKind(value: string): LabKind | string {
  return LAB_KIND_ALIASES[value] ?? value;
}

const httpUrlSchema = z
  .string()
  .url()
  .max(2048)
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "Source URLs must use http or https");

const SourceRefObjectSchema = z.object({
  title: z.string().trim().min(1).max(240),
  url: httpUrlSchema,
  authors: z.string().trim().max(240).optional(),
  publisher: z.string().trim().max(160).optional(),
  year: z.number().int().min(1990).max(2100).optional(),
  kind: z.enum(["paper", "specification", "documentation", "article", "repository"]).default("paper"),
  note: z.string().trim().max(500).optional(),
});

export const SourceRefSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    return { title: value, url: value, kind: "article" };
  },
  SourceRefObjectSchema,
);
export type SourceRef = z.infer<typeof SourceRefSchema>;

export const LabSpecSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      if (value && typeof value === "object" && !("kind" in value) && "id" in value) {
        const id = (value as { id?: unknown }).id;
        return {
          ...value,
          kind: typeof id === "string" ? normalizeLabKind(id) : id,
        };
      }
      if (value && typeof value === "object" && "kind" in value) {
        const kind = (value as { kind?: unknown }).kind;
        return typeof kind === "string"
          ? { ...value, kind: normalizeLabKind(kind) }
          : value;
      }
      return value;
    }
    const kind = normalizeLabKind(value);
    return {
      kind,
      title: LAB_TITLES[kind as LabKind] ?? value,
      summary: "可交互的本地预算与敏感性模型。",
    };
  },
  z.object({
    kind: labKindSchema,
    title: z.string().trim().min(1).max(160),
    summary: z.string().trim().min(1).max(500),
    assumptions: z.array(z.string().trim().min(1).max(240)).max(8).default([]),
    defaultInputs: z.record(z.string(), z.number().finite()).default({}),
  }),
);
export type LabSpec = z.infer<typeof LabSpecSchema>;

const normalizeKind = (value: unknown): unknown => {
  if (value === "lab-note" || value === "experiment") return "lab";
  if (value === "deep-dive") return "flagship";
  return value;
};

const normalizeMaturity = (value: unknown): unknown => {
  if (value === "production" || value === "mature") return "established";
  if (value === "research" || value === "frontier" || value === "watch") return "experimental";
  if (value === "prototype") return "emerging";
  return value;
};

const normalizeEvidence = (value: unknown): unknown => {
  if (value === "analysis" || value === "analytical" || value === "paper" || value === "reported") {
    return "analyzed";
  }
  if (value === "simulation" || value === "simulated" || value === "official" || value === "mixed") {
    return "runnable";
  }
  if (value === "field") return "reproduced";
  return value;
};

const normalizeRelated = (value: unknown): unknown => {
  if (!Array.isArray(value)) return value;
  return value.map((item) => {
    if (typeof item !== "string") return item;
    return item
      .trim()
      .replace(/^\/+/, "")
      .replace(/^content\//, "")
      .replace(/\.mdx?$/, "")
      .replace(/\/+$/, "");
  });
};

export const ContentMetaSchema = z.object({
  kind: z.preprocess(normalizeKind, contentKindSchema.default("note")),
  topic: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .max(64)
    .optional(),
  maturity: z.preprocess(normalizeMaturity, maturitySchema.optional()),
  evidence: z.preprocess(
    (value) => {
      if (value && typeof value === "object") {
        const level = (value as { level?: unknown }).level;
        return typeof level === "string"
          ? { ...value, level: normalizeEvidence(level) }
          : value;
      }
      return normalizeEvidence(value);
    },
    EvidenceSchema.optional(),
  ),
  sources: z.array(SourceRefSchema).max(24).default([]),
  lab: z.preprocess(
    (value) => {
      if (value && typeof value === "object") {
        const kind = (value as { kind?: unknown; id?: unknown }).kind ??
          (value as { id?: unknown }).id;
        return typeof kind === "string" ? normalizeLabKind(kind) : value;
      }
      return typeof value === "string" ? normalizeLabKind(value) : value;
    },
    labKindSchema.optional(),
  ),
  related: z.preprocess(
    normalizeRelated,
    z
      .array(z.string().regex(/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/))
      .max(12)
      .default([]),
  ),
  verifiedAt: z.coerce.date().optional(),
  question: z.string().trim().min(1).max(600).optional(),
  conclusion: z.string().trim().min(1).max(1200).optional(),
  takeaways: z.array(z.string().trim().min(1).max(400)).max(6).default([]),
});

export const FrontmatterSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(320),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    draft: z.boolean().default(false),
    tags: z.array(z.string().trim().min(1).max(48)).max(16).default([]),
    series: z.string().trim().max(120).optional(),
    seriesOrder: z.number().int().min(0).max(999).optional(),
    lang: z.string().trim().min(2).max(24).default("zh-CN"),
    featured: z.boolean().default(false),
    sticky: z.boolean().default(false),
    cover: z
      .object({
        src: z.string().min(1).max(2048),
        alt: z.string().trim().min(1).max(240),
      })
      .optional(),
  })
  .merge(ContentMetaSchema);

export type Frontmatter = z.infer<typeof FrontmatterSchema>;
export const contentFrontmatterSchema = FrontmatterSchema;

export const UrlSegmentSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const DraftInputSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{16,64}$/).optional(),
  version: z.number().int().positive().optional(),
  domain: contentDomainSchema,
  dirs: z.array(UrlSegmentSchema).max(6).default([]),
  slug: UrlSegmentSchema,
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(320),
  tags: z.array(z.string().trim().min(1).max(48)).max(12).default([]),
  series: z.string().trim().max(120).optional(),
  lang: z.string().trim().min(2).max(24).default("zh-CN"),
  body: z.string().min(1).max(500_000),
  kind: z.preprocess(normalizeKind, contentKindSchema.default("note")),
  topic: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(64).optional(),
  maturity: z.preprocess(normalizeMaturity, maturitySchema.optional()),
  evidence: z.preprocess(
    (value) => {
      if (value && typeof value === "object") {
        const level = (value as { level?: unknown }).level;
        return typeof level === "string"
          ? { ...value, level: normalizeEvidence(level) }
          : value;
      }
      return normalizeEvidence(value);
    },
    EvidenceSchema.optional(),
  ),
  sources: z.array(SourceRefSchema).max(24).default([]),
  lab: z.preprocess(
    (value) => {
      if (value && typeof value === "object") {
        const kind = (value as { kind?: unknown; id?: unknown }).kind ??
          (value as { id?: unknown }).id;
        return typeof kind === "string" ? normalizeLabKind(kind) : value;
      }
      return typeof value === "string" ? normalizeLabKind(value) : value;
    },
    labKindSchema.optional(),
  ),
  related: z.preprocess(
    normalizeRelated,
    z
      .array(z.string().regex(/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/))
      .max(12)
      .default([]),
  ),
  question: z.string().trim().max(400).optional(),
  conclusion: z.string().trim().max(800).optional(),
  verifiedAt: z.coerce.date().optional(),
  takeaways: z.array(z.string().trim().min(1).max(400)).max(6).default([]),
});
export type DraftInput = z.infer<typeof DraftInputSchema>;

export const PublishedWriteSchema = z.object({
  path: z.string().min(1).max(320),
  sha: z.string().regex(/^[a-f0-9]{40}$/).optional(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().min(1).max(320),
  tags: z.array(z.string().trim().min(1).max(48)).max(12).default([]),
  series: z.string().trim().max(120).optional(),
  lang: z.string().trim().min(2).max(24).default("zh-CN"),
  body: z.string().min(1).max(500_000),
  kind: z.preprocess(normalizeKind, contentKindSchema.default("note")),
  topic: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(64).optional(),
  maturity: z.preprocess(normalizeMaturity, maturitySchema.optional()),
  evidence: z.preprocess(
    (value) => {
      if (value && typeof value === "object") {
        const level = (value as { level?: unknown }).level;
        return typeof level === "string"
          ? { ...value, level: normalizeEvidence(level) }
          : value;
      }
      return normalizeEvidence(value);
    },
    EvidenceSchema.optional(),
  ),
  sources: z.array(SourceRefSchema).max(24).default([]),
  lab: z.preprocess(
    (value) => {
      if (value && typeof value === "object") {
        const kind = (value as { kind?: unknown; id?: unknown }).kind ??
          (value as { id?: unknown }).id;
        return typeof kind === "string" ? normalizeLabKind(kind) : value;
      }
      return typeof value === "string" ? normalizeLabKind(value) : value;
    },
    labKindSchema.optional(),
  ),
  related: z.preprocess(
    normalizeRelated,
    z
      .array(z.string().regex(/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/))
      .max(12)
      .default([]),
  ),
});

export function draftContentPath(input: Pick<DraftInput, "domain" | "dirs" | "slug">): string {
  return ["content", input.domain, ...input.dirs, `${input.slug}.md`].join("/");
}

/**
 * Accepts only canonical repository-relative Markdown paths beneath content/.
 * Domains are checked against the public registry by callers that know the app.
 */
export function safeContentPath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (!path || path.length > 320 || path.includes("\\") || path.includes("\0")) return null;
  if (path.startsWith("/") || path.includes("//")) return null;
  if (!/^content\/[a-z0-9-]+\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.mdx?$/.test(path)) return null;
  const segments = path.split("/");
  if (segments.some((segment) => segment === "." || segment === ".." || segment === "")) return null;
  return path;
}

export function isPublicDomain(value: string): value is DomainKey {
  return isDomainKey(value);
}

export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    requestId: z.string(),
  }),
});
export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;

export * from "./frontier";
