import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { evaluateLab, labDefinitions } from "../apps/web/src/lib/labs.ts";

const target = resolve(process.cwd(), "apps/web/src/data/lab-results.json");
await mkdir(resolve(target, ".."), { recursive: true });
const snapshots = Object.fromEntries(
  labDefinitions.map((lab) => {
    const defaults = Object.fromEntries(lab.fields.map((field) => [field.id, field.value]));
    return [
      lab.slug,
      {
        topic: lab.topic,
        title: lab.title,
        evidence: lab.evidence,
        conclusion: lab.staticConclusion,
        inputs: defaults,
        result: evaluateLab(lab.slug, defaults),
      },
    ];
  }),
);
await writeFile(target, `${JSON.stringify(snapshots, null, 2)}\n`, "utf8");
console.log(`Wrote deterministic lab snapshots to ${target}`);
