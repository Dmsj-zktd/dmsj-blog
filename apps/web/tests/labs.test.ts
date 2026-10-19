import { getFrontierTopic } from "@dmsj/content-model";
import { describe, expect, it } from "vitest";

import { loadLabEvaluator } from "../src/lib/lab-client";
import { evaluateLab, labDefinitions } from "../src/lib/labs";

describe("research labs", () => {
  it("registers ten unique runnable labs", () => {
    expect(labDefinitions).toHaveLength(10);
    expect(new Set(labDefinitions.map((lab) => lab.slug)).size).toBe(10);
  });

  it("links every lab to a frontier topic and its primary sources", () => {
    for (const lab of labDefinitions) {
      const topic = getFrontierTopic(lab.topic);
      expect(topic, `${lab.slug} has an unknown topic ${lab.topic}`).toBeDefined();
      expect(lab.sources.length, `${lab.slug} has no primary sources`).toBeGreaterThanOrEqual(2);
    }
  });

  it("computes KV cache capacity from the architecture dimensions", () => {
    const result = evaluateLab("kv-budget", {
      layers: 32,
      kvHeads: 8,
      headDim: 128,
      sequence: 8192,
      concurrency: 16,
      bytes: 2,
    });
    expect(result.metrics.find((metric) => metric.id === "bytesPerToken")?.value).toBe(131072);
    expect(result.metrics.find((metric) => metric.id === "totalGiB")?.value).toBeCloseTo(16, 1);
  });

  it("models best-of-n success independently of model scaling", () => {
    const result = evaluateLab("reasoning-budget", {
      attempts: 8,
      successRate: 0.25,
      verifierAccuracy: 0.9,
      costPerAttempt: 1.5,
    });
    expect(result.metrics.find((metric) => metric.id === "bestOfN")?.value).toBeCloseTo(
      1 - 0.75 ** 8,
      4,
    );
    expect(result.metrics.find((metric) => metric.id === "budget")?.value).toBeCloseTo(12, 4);
  });

  it("returns finite outputs for every lab default configuration", () => {
    for (const lab of labDefinitions) {
      const defaults = Object.fromEntries(lab.fields.map((field) => [field.id, field.value]));
      const result = evaluateLab(lab.slug, defaults);
      expect(result.metrics.length).toBeGreaterThanOrEqual(3);
      for (const metric of result.metrics) {
        expect(Number.isFinite(metric.value)).toBe(true);
      }
    }
  });

  it("keeps on-demand browser evaluators in parity with the server model", async () => {
    for (const lab of labDefinitions) {
      const defaults = Object.fromEntries(lab.fields.map((field) => [field.id, field.value]));
      const evaluator = await loadLabEvaluator(lab.slug);
      expect(evaluator, `${lab.slug} has no on-demand evaluator`).toBeDefined();
      expect(evaluator?.(defaults)).toEqual(evaluateLab(lab.slug, defaults));
    }
    await expect(loadLabEvaluator("not-registered")).resolves.toBeUndefined();
  });

  it("converts RISC-V working-set bounds to milliseconds", () => {
    const result = evaluateLab("riscv-roofline", {
      peakTFLOPS: 0.5,
      bandwidthGBs: 24,
      intensity: 12,
      utilization: 55,
      modelMB: 128,
    });
    expect(result.metrics.find((metric) => metric.id === "computeTime")?.value).toBeCloseTo(
      5.8568,
      4,
    );
    expect(result.metrics.find((metric) => metric.id === "memoryTime")?.value).toBeCloseTo(
      5.5924,
      3,
    );
  });

  it("derives chiplet power-budget time from energy divided by power", () => {
    const result = evaluateLab("chiplet-budget", {
      tokens: 16,
      bytesPerTokenMB: 2,
      bandwidthGBs: 256,
      energyPJByte: 0.45,
      powerW: 8,
      defect: 0.18,
    });
    const energy = result.metrics.find((metric) => metric.id === "energyMJ")?.value ?? 0;
    expect(result.metrics.find((metric) => metric.id === "powerMs")?.value).toBeCloseTo(
      energy / 8,
      3,
    );
  });
});
