import type { LabResult } from "@/lib/labs";

export type LabEvaluator = (values: Record<string, number>) => LabResult;

const loaders: Record<string, () => Promise<{ default: LabEvaluator }>> = {
  "kv-budget": () => import("./lab-evaluators/kv-budget"),
  "attention-roofline": () => import("./lab-evaluators/attention-roofline"),
  "reasoning-budget": () => import("./lab-evaluators/reasoning-budget"),
  "tool-loop": () => import("./lab-evaluators/tool-loop"),
  "moe-routing": () => import("./lab-evaluators/moe-routing"),
  "tinyml-budget": () => import("./lab-evaluators/tinyml-budget"),
  "riscv-roofline": () => import("./lab-evaluators/riscv-roofline"),
  "chiplet-budget": () => import("./lab-evaluators/chiplet-budget"),
  "sparsity-energy": () => import("./lab-evaluators/sparsity-energy"),
  "trust-budget": () => import("./lab-evaluators/trust-budget"),
};

const cache = new Map<string, Promise<LabEvaluator>>();

export function loadLabEvaluator(slug: string): Promise<LabEvaluator | undefined> {
  const existing = cache.get(slug);
  if (existing) return existing;
  const loader = loaders[slug];
  if (!loader) return Promise.resolve(undefined);
  const promise = loader()
    .then((module) => module.default)
    .catch((error) => {
      cache.delete(slug);
      throw error;
    });
  cache.set(slug, promise);
  return promise;
}
