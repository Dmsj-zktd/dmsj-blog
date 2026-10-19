import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { frontierTopics } from "@dmsj/content-model";
import { describe, expect, it } from "vitest";
import { topicDiagrams } from "../src/data/topic-diagrams";

function frontmatterOf(path: string): string {
  const text = readFileSync(path, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  expect(match, `${path} is missing frontmatter`).not.toBeNull();
  return match?.[1] ?? "";
}

function sourceCount(frontmatter: string): number {
  return (frontmatter.match(/^\s{2}-\s+title:/gm) ?? []).length;
}

function sourceUrls(frontmatter: string): string[] {
  return [...frontmatter.matchAll(/^\s{4}url:\s*"?([^"\n]+)"?$/gm)].map(
    (match) => match[1]?.trim() ?? "",
  );
}

describe("frontier research package", () => {
  it("contains both article paths for every frontier topic", () => {
    for (const topic of frontierTopics) {
      for (const [kind, id] of [
        ["flagship", topic.flagshipPath],
        ["experiment", topic.experimentPath],
      ] as const) {
        const file = resolve(process.cwd(), "content", `${id}.md`);
        expect(existsSync(file), `missing ${id}.md`).toBe(true);
        const frontmatter = frontmatterOf(file);
        expect(frontmatter).toMatch(new RegExp(`kind:\\s*"?${kind}"?`));
        expect(frontmatter).toMatch(new RegExp(`topic:\\s*"?${topic.id}"?`));
        expect(frontmatter).toMatch(/verifiedAt:\s*\d{4}-\d{2}-\d{2}/);
        expect(sourceCount(frontmatter)).toBeGreaterThanOrEqual(kind === "flagship" ? 3 : 2);
        const urls = sourceUrls(frontmatter);
        expect(new Set(urls).size, `${id} repeats a primary source`).toBe(urls.length);
      }
    }
  });

  it("contains two cross-domain synthesis notes with primary sources", () => {
    const notes = ["memory-hierarchy", "deadlines-and-agents"];
    for (const note of notes) {
      const file = resolve(process.cwd(), "content", "synthesis", `${note}.md`);
      expect(existsSync(file), `missing synthesis/${note}.md`).toBe(true);
      const frontmatter = frontmatterOf(file);
      expect(frontmatter).toMatch(/kind:\s*"?synthesis"?/);
      expect(sourceCount(frontmatter)).toBeGreaterThanOrEqual(3);
      const urls = sourceUrls(frontmatter);
      expect(new Set(urls).size, `synthesis/${note} repeats a primary source`).toBe(urls.length);
    }

    const launcher = readFileSync(resolve(process.cwd(), "src/pages/index.astro"), "utf8");
    expect(launcher).toContain("synthesisNotes");
  });

  it("keeps public URLs and the research topic registry in sync", () => {
    const ids = frontierTopics.map((topic) => topic.id);
    expect(new Set(ids).size).toBe(10);
    for (const topic of frontierTopics) {
      expect(topic.flagshipPath).toContain(topic.id);
      const domainDir = topic.domain === "ai" ? "llm-agent" : "embedded";
      expect(topic.experimentPath.startsWith(`${domainDir}/`)).toBe(true);
      expect(topic.sources.length).toBeGreaterThanOrEqual(2);
      expect(topicDiagrams[topic.id]?.stages.length).toBe(5);
    }
  });

  it("keeps research notes substantive rather than template summaries", () => {
    const cjkCount = (path: string) => {
      const text = readFileSync(path, "utf8");
      const body = text.replace(/^---[\s\S]*?---\s*/, "");
      return body.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
    };

    for (const topic of frontierTopics) {
      expect(
        cjkCount(resolve(process.cwd(), "content", `${topic.flagshipPath}.md`)),
        `${topic.flagshipPath} is below the 3,000-CJK-character floor`,
      ).toBeGreaterThanOrEqual(3_000);
      expect(
        cjkCount(resolve(process.cwd(), "content", `${topic.experimentPath}.md`)),
        `${topic.experimentPath} is below the 1,500-CJK-character floor`,
      ).toBeGreaterThanOrEqual(1_500);
    }

    for (const note of ["memory-hierarchy", "deadlines-and-agents"]) {
      expect(
        cjkCount(resolve(process.cwd(), "content", "synthesis", `${note}.md`)),
        `synthesis/${note}.md is below the 2,500-CJK-character floor`,
      ).toBeGreaterThanOrEqual(2_500);
    }
  });
});
