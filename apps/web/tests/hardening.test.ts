import { draftContentPath, SourceRefSchema, safeContentPath } from "@dmsj/content-model";
import { describe, expect, it, vi } from "vitest";
import { hashValue, requireProductionConfig } from "../functions/_shared/crypto";
import { type Env, isProd } from "../functions/_shared/env";
import { app, buildMarkdown } from "../functions/api/[[route]]";

const env = {
  ENVIRONMENT: "production",
  IP_SALT: "",
  SESSION_SECRET: "",
  ALLOWED_GITHUB_LOGIN: "",
} as unknown as Env;

describe("content path hardening", () => {
  it("accepts canonical Markdown paths", () => {
    expect(safeContentPath("apps/web/content/embedded/frontier/pqc-ledger.md")).toBe(
      "apps/web/content/embedded/frontier/pqc-ledger.md",
    );
  });

  it("rejects traversal, absolute paths, backslashes, and non-content paths", () => {
    expect(safeContentPath("apps/web/content/embedded/../../etc/passwd.md")).toBeNull();
    expect(safeContentPath("/apps/web/content/embedded/a.md")).toBeNull();
    expect(safeContentPath("apps\\web\\content\\embedded\\a.md")).toBeNull();
    expect(safeContentPath("apps/web/content/embedded//a.md")).toBeNull();
    expect(safeContentPath("content/embedded/a.md")).toBeNull();
    expect(safeContentPath("README.md")).toBeNull();
  });

  it("derives publication paths beneath the Astro content root", () => {
    expect(
      draftContentPath({
        domain: "thoughts",
        dirs: ["acceptance"],
        slug: "smoke",
      }),
    ).toBe("apps/web/content/thoughts/acceptance/smoke.md");
  });
});

describe("production fail-closed configuration", () => {
  it("treats an empty environment as production instead of enabling local fallbacks", () => {
    const empty = {} as Env;
    expect(isProd(empty)).toBe(true);
    expect(() => requireProductionConfig(empty)).toThrow(/incomplete/);
  });

  it("refuses incomplete production admin configuration", () => {
    expect(() => requireProductionConfig(env)).toThrow(/incomplete/);
  });

  it("does not silently hash with a fixed production salt", async () => {
    await expect(hashValue(env, "127.0.0.1")).rejects.toThrow(/IP_SALT/);
  });

  it("allows local development without production secrets", async () => {
    const local = { ...env, ENVIRONMENT: "development" } as Env;
    expect(await hashValue(local, "127.0.0.1")).toHaveLength(64);
  });
});

describe("source URL validation", () => {
  it("accepts only HTTP(S) primary-source links", () => {
    const base = { title: "Source", kind: "paper" as const };
    expect(SourceRefSchema.safeParse({ ...base, url: "https://example.com/paper" }).success).toBe(
      true,
    );
    expect(SourceRefSchema.safeParse({ ...base, url: "http://example.com/paper" }).success).toBe(
      true,
    );
    expect(SourceRefSchema.safeParse({ ...base, url: "javascript:alert(1)" }).success).toBe(false);
    expect(
      SourceRefSchema.safeParse({ ...base, url: "data:text/html,<script>alert(1)</script>" })
        .success,
    ).toBe(false);
  });
});

describe("draft publication", () => {
  it("writes canonical frontmatter at the first byte", () => {
    const markdown = buildMarkdown({
      domain: "embedded",
      dirs: ["frontier"],
      slug: "example",
      title: "Example",
      description: "A focused note",
      tags: ["示例"],
      lang: "zh-CN",
      body: "正文",
      kind: "flagship",
      sources: [],
      related: [],
      takeaways: [],
    });
    expect(markdown.startsWith("---\n")).toBe(true);
    expect(markdown).toContain("\n\n正文\n");
  });
});

describe("API error envelope", () => {
  it("returns code, message, and request id for configuration failures", async () => {
    const response = await app.request(
      "https://example.com/api/admin/drafts",
      { method: "POST" },
      env,
    );
    expect(response.status).toBe(503);
    expect(response.headers.get("x-request-id")).toMatch(/^[a-f0-9]{16}$/);
    await expect(response.json()).resolves.toMatchObject({
      error: {
        code: "server_not_configured",
        requestId: expect.stringMatching(/^[a-f0-9]{16}$/),
      },
    });
  });

  it("fails OAuth callbacks closed when production config is incomplete", async () => {
    const response = await app.request(
      "https://example.com/api/auth/callback?code=x&state=y",
      {},
      env,
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://example.com/admin/?error=server_not_configured",
    );
  });

  it("rate limits OAuth state creation before writing another KV value", async () => {
    const get = vi.fn().mockResolvedValue("30");
    const put = vi.fn();
    const local = {
      ENVIRONMENT: "development",
      SESSION: { get, put },
    } as unknown as Env;
    const response = await app.request(
      "http://localhost/api/auth/login-start",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
      local,
    );
    expect(response.status).toBe(429);
    expect(put).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "rate_limited" },
    });
  });

  it("does not record analytics writes on a non-main Pages preview", async () => {
    const prepare = vi.fn();
    const preview = {
      CF_PAGES: "1",
      CF_PAGES_BRANCH: "signal-lab-v2",
      DB: { prepare },
    } as unknown as Env;
    const response = await app.request(
      "https://preview.example/api/track",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ path: "/preview", referrer: "" }),
      },
      preview,
    );
    expect(response.status).toBe(204);
    expect(prepare).not.toHaveBeenCalled();
  });
});
