import { describe, expect, it } from "vitest";

import { buildMarkdown } from "../functions/api/[[route]]";

describe("draft publication frontmatter", () => {
  it("preserves structured research metadata and safely quotes values", () => {
    const markdown = buildMarkdown({
      domain: "llm-agent",
      dirs: ["frontier"],
      slug: "example",
      title: 'A "quoted" title',
      description: "A bounded description",
      tags: ["Agent", "安全"],
      lang: "zh-CN",
      body: "## Core idea\n\nText.",
      kind: "flagship",
      topic: "mcp-trust-boundary",
      maturity: "emerging",
      sources: [
        {
          title: "Primary source",
          url: "https://example.com/paper",
          publisher: "Example",
          year: 2025,
          kind: "paper",
        },
      ],
      evidence: {
        level: "analyzed",
        scope: "Local analysis",
        caveats: ["No hardware measurement"],
      },
      lab: "tool-loop",
      related: ["llm-agent/frontier/mcp-trust-boundary"],
      verifiedAt: new Date("2026-10-19T00:00:00.000Z"),
      question: "How should trust boundaries be modeled?",
      conclusion: "Model them explicitly.",
      takeaways: ["Keep tools sandboxed."],
    });

    expect(markdown).toContain('title: "A \\"quoted\\" title"');
    expect(markdown).toContain('kind: "flagship"');
    expect(markdown).toContain('topic: "mcp-trust-boundary"');
    expect(markdown).toContain("sources:");
    expect(markdown).toContain('url: "https://example.com/paper"');
    expect(markdown).toContain("evidence:");
    expect(markdown).toContain('lab: "tool-loop"');
    expect(markdown).toContain("verifiedAt: 2026-10-19");
    expect(markdown).toContain("## Core idea");
  });
});
