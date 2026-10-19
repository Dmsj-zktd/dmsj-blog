import {
  contentDomainSchema,
  type DraftInput,
  DraftInputSchema,
  isPublicDomain,
  safeContentPath,
} from "@dmsj/content-model";
import { type Context, Hono } from "hono";
import { z } from "zod";
import { recordPageView } from "../_shared/analytics";
import { writeAudit } from "../_shared/audit";
import {
  checkCsrf,
  createSession,
  destroySession,
  getSession,
  type Session,
} from "../_shared/auth";
import {
  clearCookieHeader,
  clearOAuthCookieHeader,
  cookieHeader,
  OAUTH_COOKIE,
  oauthCookieHeader,
  parseCookies,
} from "../_shared/cookies";
import {
  boundedInt,
  dayRangeEpochMs,
  hashValue,
  isValidDay,
  randomToken,
  requireProductionConfig,
} from "../_shared/crypto";
import { toCsv } from "../_shared/csv";
import type { Env } from "../_shared/env";
import { buildGitHubClient, type GitHubClient } from "../_shared/github";
import { rateLimit } from "../_shared/rate";

type AppEnv = {
  Bindings: Env;
  Variables: {
    session: Session;
    requestId: string;
  };
};

export const app = new Hono<AppEnv>();

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function jsonError(c: Context<AppEnv>, code: string, status: number, message?: string): Response {
  return json(
    {
      error: {
        code,
        message: message ?? code.replaceAll("_", " "),
        requestId: c.get("requestId"),
      },
    },
    status,
  );
}

app.use("*", async (c, next) => {
  c.set("requestId", randomToken(8));
  await next();
  const headers = c.res.headers;
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("X-Request-Id", c.get("requestId"));
  headers.set(
    "Content-Security-Policy",
    "default-src 'none'; script-src 'none'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  );
});

function clientIp(c: Context<AppEnv>): string {
  const value =
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return value || "unknown";
}

function originOf(c: Context<AppEnv>): string {
  return (c.env.SITE_URL ?? new URL(c.req.raw.url).origin).replace(/\/$/, "");
}

/* ---------------- 公开：访客信标 ---------------- */

app.post("/api/track", async (c) => {
  if (c.env.CF_PAGES === "1" && c.env.CF_PAGES_BRANCH !== "main") {
    return c.body(null, 204);
  }
  const ip = clientIp(c);
  const contentLength = Number(c.req.header("content-length") ?? "0");
  if (Number.isFinite(contentLength) && contentLength > 16_384) {
    return c.body(null, 413);
  }
  const allowed = await rateLimit(c.env, "track", ip, 5_000, 86_400);
  if (!allowed) return c.body(null, 429);

  let path = "";
  let referrer = "";
  let ua = "";
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await c.req.json().catch(() => ({}));
    path = String(body.path ?? "");
    referrer = String(body.referrer ?? "");
    ua = c.req.header("user-agent") ?? "";
  } else {
    const body = await c.req.parseBody();
    path = String(body.path ?? "");
    referrer = String(body.referrer ?? "");
    ua = c.req.header("user-agent") ?? "";
  }
  const country = c.req.header("cf-ipcountry") || null;
  try {
    await recordPageView(c.env, {
      path: path.slice(0, 600),
      referrer: referrer.slice(0, 2_048),
      ua,
      ip,
      country,
    });
  } catch {
    // Analytics is optional and must not break public navigation or expose config errors.
  }
  return c.body(null, 204);
});

/* ---------------- 认证：GitHub OAuth ---------------- */

const loginSchema = z.object({
  turnstileToken: z.string().optional(),
});

app.post("/api/auth/login-start", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return jsonError(c, "invalid_request", 400);
  const allowed = await rateLimit(c.env, "login", clientIp(c), 30, 3_600);
  if (!allowed) return jsonError(c, "rate_limited", 429, "Too many login attempts");
  try {
    requireProductionConfig(c.env);
  } catch {
    return jsonError(c, "server_not_configured", 503);
  }

  const clientId = c.env.GITHUB_CLIENT_ID;
  const clientSecret = c.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return jsonError(c, "github_oauth_not_configured", 503);
  }

  if (c.env.TURNSTILE_SECRET_KEY) {
    const token = parsed.data.turnstileToken;
    if (!token) return jsonError(c, "turnstile_required", 400);
    const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        secret: c.env.TURNSTILE_SECRET_KEY,
        response: token,
        remoteip: clientIp(c),
      }),
    });
    const check = (await verify.json()) as { success?: boolean };
    if (!check.success) return jsonError(c, "turnstile_failed", 403);
  }

  const state = randomToken(16);
  const verifier = randomToken(24);
  await c.env.SESSION.put(`oauth:state:${state}`, verifier, {
    expirationTtl: 600,
  });
  const redirectUri = `${originOf(c)}/api/auth/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user public_repo",
    state,
  });
  return new Response(
    JSON.stringify({ url: `https://github.com/login/oauth/authorize?${params}` }),
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
        "X-Request-Id": c.get("requestId"),
        "Set-Cookie": oauthCookieHeader(c.env, verifier),
      },
    },
  );
});

app.get("/api/auth/callback", async (c) => {
  try {
    requireProductionConfig(c.env);
  } catch {
    return c.redirect(`${originOf(c)}/admin/?error=server_not_configured`);
  }
  const code = c.req.query("code") ?? "";
  const state = c.req.query("state") ?? "";
  const stored = await c.env.SESSION.get(`oauth:state:${state}`);
  const verifier = parseCookies(c.req.raw)[OAUTH_COOKIE];
  if (!code || !state || !stored || !verifier || stored !== verifier) {
    return c.redirect(`${originOf(c)}/admin/?error=bad_state`);
  }
  await c.env.SESSION.delete(`oauth:state:${state}`);

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: c.env.GITHUB_CLIENT_ID,
      client_secret: c.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${originOf(c)}/api/auth/callback`,
    }),
  });
  const tokenBody = (await tokenResponse.json()) as {
    access_token?: string;
    error?: string;
  };
  if (!tokenBody.access_token) {
    await writeAudit(c.env, { login: "unknown" }, "LOGIN_FAILED", "auth", {
      ipHash: await hashValue(c.env, clientIp(c)),
      requestId: c.get("requestId"),
    });
    return c.redirect(`${originOf(c)}/admin/?error=oauth_failed`);
  }

  const gh = buildGitHubClient(c.env, tokenBody.access_token, "oauth-user");
  let user: Awaited<ReturnType<GitHubClient["getAuthenticatedUser"]>>;
  try {
    user = await gh.getAuthenticatedUser();
  } catch {
    return c.redirect(`${originOf(c)}/admin/?error=oauth_failed`);
  }

  if (user.login !== c.env.ALLOWED_GITHUB_LOGIN) {
    await writeAudit(c.env, user, "LOGIN_DENIED", "auth", {
      ipHash: await hashValue(c.env, clientIp(c)),
      success: false,
      requestId: c.get("requestId"),
    });
    return c.redirect(`${originOf(c)}/admin/?error=denied`);
  }

  const session = await createSession(c.env, user, tokenBody.access_token);
  await writeAudit(c.env, user, "LOGIN", "auth", {
    resourceId: session.id,
    ipHash: await hashValue(c.env, clientIp(c)),
    requestId: c.get("requestId"),
  });
  const headers = new Headers({ Location: `${originOf(c)}/admin/` });
  headers.append("Set-Cookie", cookieHeader(c.env, session.id, 60 * 60 * 24 * 7));
  headers.append("Set-Cookie", clearOAuthCookieHeader(c.env));
  return new Response(null, { status: 302, headers });
});

app.get("/api/auth/me", async (c) => {
  const session = await getSession(c.env, c.req.raw);
  if (!session) return json({ user: null });
  return json({ user: session.user, csrfToken: session.csrfToken });
});

app.get("/api/auth/config", async (c) => {
  return json({
    turnstile: {
      enabled: Boolean(c.env.TURNSTILE_SITE_KEY && c.env.TURNSTILE_SECRET_KEY),
      siteKey: c.env.TURNSTILE_SITE_KEY ?? null,
    },
  });
});

app.post("/api/auth/logout", async (c) => {
  const session = await getSession(c.env, c.req.raw);
  if (!session || !checkCsrf(c.env, c.req.raw, session)) {
    return jsonError(c, "unauthorized", 401);
  }
  await destroySession(c.env, c.req.raw);
  if (session) {
    await writeAudit(c.env, session.user, "LOGOUT", "auth", {
      resourceId: session.id,
      requestId: c.get("requestId"),
    });
  }
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": clearCookieHeader(c.env) },
  });
});

/* ---------------- Admin 鉴权中间件 ---------------- */

async function auditAdminFailure(
  c: Context<AppEnv>,
  session: Session,
  status: number,
): Promise<void> {
  try {
    await writeAudit(c.env, session.user, "ADMIN_WRITE_FAILED", "admin", {
      resourceId: new URL(c.req.url).pathname,
      success: false,
      ipHash: await hashValue(c.env, clientIp(c)),
      details: { method: c.req.method, status },
      requestId: c.get("requestId"),
    });
  } catch {
    // The response must remain authoritative if the audit store is unavailable.
  }
}

app.use("/api/admin/*", async (c, next) => {
  try {
    requireProductionConfig(c.env);
  } catch {
    return jsonError(c, "server_not_configured", 503);
  }
  const session = await getSession(c.env, c.req.raw);
  if (!session) return jsonError(c, "unauthorized", 401);
  c.set("session", session);
  if (c.req.method !== "GET" && !checkCsrf(c.env, c.req.raw, session)) {
    await auditAdminFailure(c, session, 403);
    return jsonError(c, "csrf_failed", 403);
  }
  try {
    await next();
  } catch (error) {
    if (c.req.method !== "GET") await auditAdminFailure(c, session, 500);
    throw error;
  }
  if (c.req.method !== "GET" && c.res.status >= 400) {
    await auditAdminFailure(c, session, c.res.status);
  }
});

/* ---------------- 访客统计 ---------------- */

const groupColumns = {
  path: "path",
  referrer: "referrer_host",
  country: "country",
  browser: "browser",
  os: "os",
  device: "device",
} as const;

type DateRangeResult =
  | { ok: true; from: string; to: string }
  | { ok: false; errorCode: "invalid_date_range" | "date_range_too_large" };

function requireDateRange(query: Record<string, string>): DateRangeResult {
  const from = query.from ?? "";
  const to = query.to ?? "";
  if (!isValidDay(from) || !isValidDay(to)) {
    return { ok: false, errorCode: "invalid_date_range" };
  }
  if (from > to) return { ok: false, errorCode: "invalid_date_range" };
  const span = new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime();
  if (span > 366 * 86_400_000) return { ok: false, errorCode: "date_range_too_large" };
  return { ok: true, from, to };
}

app.get("/api/admin/analytics/overview", async (c) => {
  const query = c.req.query();
  const range = requireDateRange(query);
  if (!range.ok) return jsonError(c, range.errorCode, 400);
  const offset = Number(c.env.ANALYTICS_TZ_MINUTES ?? "480");
  const { start, end } = dayRangeEpochMs(range.from, range.to, offset);
  const total = await c.env.DB.prepare(
    `SELECT COALESCE(SUM(views), 0) AS views FROM page_view_daily WHERE day BETWEEN ? AND ?`,
  )
    .bind(range.from, range.to)
    .first<{ views: number }>();
  const unique = await c.env.DB.prepare(
    `SELECT COUNT(DISTINCT ip_hash) AS uniques FROM page_view_events WHERE ts >= ? AND ts < ? AND ip_hash IS NOT NULL`,
  )
    .bind(start, end)
    .first<{ uniques: number }>();
  const daily = await c.env.DB.prepare(
    `SELECT day, SUM(views) AS views FROM page_view_daily
     WHERE day BETWEEN ? AND ? GROUP BY day ORDER BY day`,
  )
    .bind(range.from, range.to)
    .all<{ day: string; views: number }>();
  return json({
    from: range.from,
    to: range.to,
    totalViews: Number(total?.views ?? 0),
    uniqueVisitors: Number(unique?.uniques ?? 0),
    daily: daily.results,
  });
});

app.get("/api/admin/analytics/breakdown", async (c) => {
  const query = c.req.query();
  const range = requireDateRange(query);
  if (!range.ok) return jsonError(c, range.errorCode, 400);
  const group = (query.group ?? "path") as keyof typeof groupColumns;
  const column = groupColumns[group];
  if (!column) return jsonError(c, "invalid_group", 400);
  const q = (query.q ?? "").trim().slice(0, 200);
  const pageSize = boundedInt(query.pageSize, 20, 1, 100);
  const page = boundedInt(query.page, 1, 1, 100_000);
  const offset = (page - 1) * pageSize;
  const sql = `
    SELECT ${column} AS key, SUM(views) AS views
    FROM page_view_daily
    WHERE day BETWEEN ? AND ? ${q ? "AND path LIKE ? ESCAPE '\\'" : ""}
    GROUP BY ${column}
    ORDER BY views DESC, key ASC
    LIMIT ? OFFSET ?`;
  const binds: Array<string | number> = [range.from, range.to];
  if (q) binds.push(`%${escapeLike(q)}%`);
  binds.push(pageSize, offset);
  const rows = await c.env.DB.prepare(sql)
    .bind(...binds)
    .all<{
      key: string;
      views: number;
    }>();
  const count = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM (
      SELECT 1 FROM page_view_daily
      WHERE day BETWEEN ? AND ? ${q ? "AND path LIKE ? ESCAPE '\\'" : ""}
      GROUP BY ${column}
    )`,
  )
    .bind(...(q ? [range.from, range.to, `%${escapeLike(q)}%`] : [range.from, range.to]))
    .first<{ total: number }>();

  if (query.format === "csv") {
    const csv = toCsv(
      ["key", "views"],
      rows.results.map((row) => [row.key, row.views]),
    );
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="analytics-${group}-${range.from}-${range.to}.csv"`,
      },
    });
  }
  return json({
    rows: rows.results,
    total: Number(count?.total ?? 0),
    page,
    pageSize,
  });
});

function escapeLike(value: string): string {
  return value.replaceAll("%", "\\%").replaceAll("_", "\\_");
}

/* ---------------- 审计日志 ---------------- */

app.get("/api/admin/audit-logs", async (c) => {
  const range = requireDateRange(c.req.query());
  if (!range.ok) return jsonError(c, range.errorCode, 400);
  const pageSize = boundedInt(c.req.query("pageSize"), 50, 1, 200);
  const page = boundedInt(c.req.query("page"), 1, 1, 100_000);
  const offset = (page - 1) * pageSize;
  const total = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM audit_logs WHERE ts >= ? AND ts < ?`,
  )
    .bind(
      dayRangeEpochMs(range.from, range.to, 0).start,
      dayRangeEpochMs(range.from, range.to, 0).end,
    )
    .first<{ total: number }>();
  const rows = await c.env.DB.prepare(
    `SELECT ts, actor, action, resource, resource_id AS resourceId, success, details
     FROM audit_logs
     WHERE ts >= ? AND ts < ?
     ORDER BY ts DESC LIMIT ? OFFSET ?`,
  )
    .bind(
      dayRangeEpochMs(range.from, range.to, 0).start,
      dayRangeEpochMs(range.from, range.to, 0).end,
      pageSize,
      offset,
    )
    .all();
  return json({ rows: rows.results, total: Number(total?.total ?? 0), page, pageSize });
});

/* ---------------- 文章与草稿 ---------------- */

function sessionOf(c: Context<AppEnv>): Session | null {
  return c.get("session");
}

app.get("/api/admin/articles", async (c) => {
  const session = sessionOf(c);
  if (!session) return jsonError(c, "unauthorized", 401);
  const gh = buildGitHubClient(c.env, session.githubToken, session.user.login);
  const files = await gh.getTree().catch(() => []);
  const drafts = await c.env.DB.prepare(
    `SELECT id, domain, dirs, slug, title, description, tags_json AS tagsJson,
            series, lang, metadata_json AS metadataJson, version, updated_at AS updatedAt
     FROM drafts ORDER BY updated_at DESC`,
  ).all<{
    id: string;
    domain: string;
    dirs: string;
    slug: string;
    title: string;
    description: string;
    tagsJson: string;
    series: string | null;
    lang: string;
    metadataJson: string;
    version: number;
    updatedAt: number;
  }>();
  const published = files
    .filter((file) => file.path.endsWith(".md") || file.path.endsWith(".mdx"))
    .map((file) => ({
      path: file.path,
      sha: file.sha,
      size: file.size ?? 0,
    }));
  return json({
    published,
    drafts: drafts.results.map((row) => ({
      ...row,
      dirs: JSON.parse(row.dirs) as string[],
      tags: JSON.parse(row.tagsJson) as string[],
      metadata: JSON.parse(row.metadataJson) as Record<string, unknown>,
    })),
  });
});

const draftSchema = DraftInputSchema;

app.post("/api/admin/drafts", async (c) => {
  const session = sessionOf(c);
  if (!session) return jsonError(c, "unauthorized", 401);
  const parsed = draftSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return jsonError(c, "invalid_request", 400, "Draft validation failed");
  }
  const data = parsed.data;
  const id = data.id ?? randomToken(16);
  const now = Date.now();
  const metadata = {
    kind: data.kind,
    topic: data.topic ?? null,
    maturity: data.maturity ?? null,
    sources: data.sources,
    evidence: data.evidence ?? null,
    lab: data.lab ?? null,
    related: data.related,
    verifiedAt: data.verifiedAt ?? null,
    question: data.question ?? null,
    conclusion: data.conclusion ?? null,
    takeaways: data.takeaways,
  };
  const existing = await c.env.DB.prepare("SELECT version FROM drafts WHERE id = ?")
    .bind(id)
    .first<{ version: number }>();
  if (existing) {
    if (data.version && data.version !== existing.version) {
      return jsonError(c, "draft_conflict", 409, "The draft was modified elsewhere");
    }
    const updated = await c.env.DB.prepare(
      `UPDATE drafts SET domain=?, dirs=?, slug=?, title=?, description=?, tags_json=?,
       series=?, lang=?, body=?, metadata_json=?, version=version+1, updated_at=?
       WHERE id=? AND version=?`,
    )
      .bind(
        data.domain,
        JSON.stringify(data.dirs),
        data.slug,
        data.title,
        data.description,
        JSON.stringify(data.tags),
        data.series ?? null,
        data.lang,
        data.body,
        JSON.stringify(metadata),
        now,
        id,
        existing.version,
      )
      .run();
    if (Number(updated.meta.changes ?? 0) === 0) {
      return jsonError(c, "draft_conflict", 409, "The draft was modified elsewhere");
    }
  } else {
    await c.env.DB.prepare(
      `INSERT INTO drafts
       (id, domain, dirs, slug, title, description, tags_json, series, lang, body,
        metadata_json, version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
    )
      .bind(
        id,
        data.domain,
        JSON.stringify(data.dirs),
        data.slug,
        data.title,
        data.description,
        JSON.stringify(data.tags),
        data.series ?? null,
        data.lang,
        data.body,
        JSON.stringify(metadata),
        now,
        now,
      )
      .run();
  }
  await writeAudit(c.env, session.user, "UPSERT_DRAFT", "article", {
    resourceId: id,
    ipHash: await hashValue(c.env, clientIp(c)),
    requestId: c.get("requestId"),
  });
  return json({ id });
});

app.get("/api/admin/drafts/:id", async (c) => {
  const session = sessionOf(c);
  if (!session) return jsonError(c, "unauthorized", 401);
  const row = await c.env.DB.prepare(
    `SELECT id, domain, dirs, slug, title, description, tags_json AS tagsJson,
            series, lang, body, metadata_json AS metadataJson, version,
            updated_at AS updatedAt
     FROM drafts WHERE id = ?`,
  )
    .bind(c.req.param("id"))
    .first<{
      id: string;
      domain: string;
      dirs: string;
      slug: string;
      title: string;
      description: string;
      tagsJson: string;
      series: string | null;
      lang: string;
      body: string;
      metadataJson: string;
      version: number;
      updatedAt: number;
    }>();
  if (!row) return jsonError(c, "not_found", 404);
  return json({
    ...row,
    dirs: JSON.parse(row.dirs),
    tags: JSON.parse(row.tagsJson),
    metadata: JSON.parse(row.metadataJson),
  });
});

app.delete("/api/admin/drafts/:id", async (c) => {
  const session = sessionOf(c);
  if (!session) return jsonError(c, "unauthorized", 401);
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM drafts WHERE id = ?").bind(id).run();
  await writeAudit(c.env, session.user, "DELETE_DRAFT", "article", {
    resourceId: id,
    ipHash: await hashValue(c.env, clientIp(c)),
    requestId: c.get("requestId"),
  });
  return c.body(null, 204);
});

function yamlString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", " ")}"`;
}

function yamlArray(values: string[]): string {
  return `[${values.map((value) => yamlString(value)).join(", ")}]`;
}

export function buildMarkdown(draft: DraftInput): string {
  const lines = [
    "---",
    `title: ${yamlString(draft.title)}`,
    `description: ${yamlString(draft.description)}`,
    `date: ${new Date().toISOString().slice(0, 10)}`,
    `tags: ${yamlArray(draft.tags)}`,
    draft.series ? `series: ${yamlString(draft.series)}` : "",
    `lang: ${yamlString(draft.lang)}`,
    `kind: ${yamlString(draft.kind)}`,
    draft.topic ? `topic: ${yamlString(draft.topic)}` : "",
    draft.maturity ? `maturity: ${yamlString(draft.maturity)}` : "",
    draft.question ? `question: ${yamlString(draft.question)}` : "",
    draft.conclusion ? `conclusion: ${yamlString(draft.conclusion)}` : "",
  ];

  if (draft.takeaways.length > 0) {
    lines.push("takeaways:");
    for (const takeaway of draft.takeaways) lines.push(`  - ${yamlString(takeaway)}`);
  }
  if (draft.evidence) {
    lines.push("evidence:");
    lines.push(`  level: ${yamlString(draft.evidence.level)}`);
    if (draft.evidence.scope) lines.push(`  scope: ${yamlString(draft.evidence.scope)}`);
    if (draft.evidence.basis) lines.push(`  basis: ${yamlString(draft.evidence.basis)}`);
    if (draft.evidence.caveats.length > 0) {
      lines.push("  caveats:");
      for (const caveat of draft.evidence.caveats) lines.push(`    - ${yamlString(caveat)}`);
    }
  }
  if (draft.sources.length > 0) {
    lines.push("sources:");
    for (const source of draft.sources) {
      lines.push(`  - title: ${yamlString(source.title)}`);
      lines.push(`    url: ${yamlString(source.url)}`);
      if (source.authors) lines.push(`    authors: ${yamlString(source.authors)}`);
      if (source.publisher) lines.push(`    publisher: ${yamlString(source.publisher)}`);
      if (source.year) lines.push(`    year: ${source.year}`);
      lines.push(`    kind: ${yamlString(source.kind)}`);
      if (source.note) lines.push(`    note: ${yamlString(source.note)}`);
    }
  }
  if (draft.lab) lines.push(`lab: ${yamlString(draft.lab)}`);
  if (draft.verifiedAt) {
    lines.push(`verifiedAt: ${new Date(draft.verifiedAt).toISOString().slice(0, 10)}`);
  }
  if (draft.related.length > 0) {
    lines.push("related:");
    for (const related of draft.related) lines.push(`  - ${yamlString(related)}`);
  }
  lines.push("draft: false", "---");

  const frontmatter = lines.filter((line) => line !== "").join("\n");
  return `${frontmatter}\n\n${draft.body.trim()}\n`;
}

app.post("/api/admin/drafts/:id/publish", async (c) => {
  const session = sessionOf(c);
  if (!session) return jsonError(c, "unauthorized", 401);
  const row = await c.env.DB.prepare(
    `SELECT id, domain, dirs, slug, title, description, tags_json AS tagsJson,
            series, lang, body, metadata_json AS metadataJson, version
     FROM drafts WHERE id = ?`,
  )
    .bind(c.req.param("id"))
    .first<{
      id: string;
      domain: string;
      dirs: string;
      slug: string;
      title: string;
      description: string;
      tagsJson: string;
      series: string | null;
      lang: string;
      body: string;
      metadataJson: string;
      version: number;
    }>();
  if (!row) return jsonError(c, "not_found", 404);
  const domain = contentDomainSchema.safeParse(row.domain);
  if (!domain.success) return jsonError(c, "invalid_domain", 400);
  const metadata = JSON.parse(row.metadataJson || "{}") as Partial<DraftInput>;
  const draft: DraftInput = {
    domain: domain.data,
    dirs: JSON.parse(row.dirs) as string[],
    slug: row.slug,
    title: row.title,
    description: row.description,
    tags: JSON.parse(row.tagsJson) as string[],
    series: row.series ?? undefined,
    lang: row.lang,
    body: row.body,
    kind: metadata.kind ?? "note",
    topic: metadata.topic,
    maturity: metadata.maturity,
    sources: metadata.sources ?? [],
    evidence: metadata.evidence,
    lab: metadata.lab,
    related: metadata.related ?? [],
    verifiedAt: metadata.verifiedAt ? new Date(metadata.verifiedAt) : new Date(),
    question: metadata.question,
    conclusion: metadata.conclusion,
    takeaways: metadata.takeaways ?? [],
  };
  const path = safeContentPath(
    `content/${draft.domain}/${draft.dirs.length ? `${draft.dirs.join("/")}/` : ""}${draft.slug}.md`,
  );
  if (!path) return jsonError(c, "invalid_content_path", 400);
  const gh = buildGitHubClient(c.env, session.githubToken, session.user.login);
  try {
    const tree = await gh.getTree();
    const existing = tree.find((file) => file.path === path);
    if (existing)
      return jsonError(c, "publish_conflict", 409, "A published file already exists at this path");
    await gh.putFile(
      path,
      buildMarkdown(draft),
      `docs(${draft.domain}): publish ${draft.slug}`,
      undefined,
    );
  } catch (error) {
    await writeAudit(c.env, session.user, "PUBLISH_FAILED", "article", {
      resourceId: row.id,
      success: false,
      ipHash: await hashValue(c.env, clientIp(c)),
      details: error instanceof Error ? error.message : String(error),
      requestId: c.get("requestId"),
    });
    return jsonError(c, "publish_failed", 502);
  }
  const removed = await c.env.DB.prepare("DELETE FROM drafts WHERE id = ? AND version = ?")
    .bind(row.id, row.version)
    .run();
  const draftRetained = Number(removed.meta.changes ?? 0) === 0;
  await writeAudit(c.env, session.user, "PUBLISH", "article", {
    resourceId: path,
    ipHash: await hashValue(c.env, clientIp(c)),
    details: draftRetained ? { draftRetained: true } : undefined,
    requestId: c.get("requestId"),
  });
  return json({ path, draftRetained });
});

const publishedWriteSchema = z.object({
  path: z.string().regex(/^content\/[a-z0-9-]+\/.+\.(md|mdx)$/),
  sha: z.string().optional(),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(320),
  tags: z.array(z.string()).max(12).default([]),
  series: z.string().optional(),
  lang: z.string().default("zh-CN"),
  body: z.string().min(1).max(500_000),
});

const rawArticleSchema = z.object({
  path: z.string().regex(/^content\/[a-z0-9-]+\/.+\.(md|mdx)$/),
  sha: z.string().optional(),
  content: z.string().min(3).max(600_000),
});

app.put("/api/admin/raw-article", async (c) => {
  const session = sessionOf(c);
  if (!session) return jsonError(c, "unauthorized", 401);
  const parsed = rawArticleSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return jsonError(c, "invalid_request", 400, "Article validation failed");
  }
  const data = parsed.data;
  const safePath = safeContentPath(data.path);
  if (!safePath || !isPublicDomain(safePath.split("/")[1] ?? "")) {
    return jsonError(c, "invalid_path", 400);
  }
  data.path = safePath;
  const gh = buildGitHubClient(c.env, session.githubToken, session.user.login);
  const oldSha =
    data.sha ??
    (await gh.getTree().then((tree) => tree.find((item) => item.path === data.path)?.sha));
  await gh.putFile(
    data.path,
    data.content,
    `docs(${data.path.split("/")[1]}): update article`,
    oldSha,
  );
  await writeAudit(c.env, session.user, "UPDATE_ARTICLE", "article", {
    resourceId: data.path,
    ipHash: await hashValue(c.env, clientIp(c)),
    requestId: c.get("requestId"),
  });
  return json({ ok: true });
});

app.put("/api/admin/article", async (c) => {
  const session = sessionOf(c);
  if (!session) return jsonError(c, "unauthorized", 401);
  const parsed = publishedWriteSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return jsonError(c, "invalid_request", 400, "Article validation failed");
  }
  const data = parsed.data;
  const safePath = safeContentPath(data.path);
  if (!safePath || !isPublicDomain(safePath.split("/")[1] ?? "")) {
    return jsonError(c, "invalid_path", 400);
  }
  data.path = safePath;
  const gh = buildGitHubClient(c.env, session.githubToken, session.user.login);
  const oldSha =
    data.sha ??
    (await gh.getTree().then((tree) => tree.find((item) => item.path === data.path)?.sha));
  const yaml = [
    `title: ${yamlString(data.title)}`,
    `description: ${yamlString(data.description)}`,
    `tags: [${data.tags.map((tag) => yamlString(tag)).join(", ")}]`,
    data.series ? `series: ${yamlString(data.series)}` : "",
    `lang: ${yamlString(data.lang)}`,
    "draft: false",
  ].join("\n");
  await gh.putFile(
    data.path,
    `---\n${yaml}\n---\n\n${data.body.trim()}\n`,
    `docs(${data.path.split("/")[1]}): update ${data.path}`,
    oldSha,
  );
  await writeAudit(c.env, session.user, "UPDATE_ARTICLE", "article", {
    resourceId: data.path,
    ipHash: await hashValue(c.env, clientIp(c)),
    requestId: c.get("requestId"),
  });
  return json({ ok: true });
});

app.get("/api/admin/article", async (c) => {
  const session = sessionOf(c);
  if (!session) return jsonError(c, "unauthorized", 401);
  const path = c.req.query("path") ?? "";
  const safePath = safeContentPath(path);
  if (!safePath || !isPublicDomain(safePath.split("/")[1] ?? "")) {
    return jsonError(c, "invalid_path", 400);
  }
  const gh = buildGitHubClient(c.env, session.githubToken, session.user.login);
  const content = await gh.getRawFile(safePath).catch(() => null);
  if (content === null) return jsonError(c, "not_found", 404);
  return json({ path: safePath, content });
});

app.delete("/api/admin/article", async (c) => {
  const session = sessionOf(c);
  if (!session) return jsonError(c, "unauthorized", 401);
  const path = c.req.query("path") ?? "";
  const safePath = safeContentPath(path);
  if (!safePath || !isPublicDomain(safePath.split("/")[1] ?? "")) {
    return jsonError(c, "invalid_path", 400);
  }
  const gh = buildGitHubClient(c.env, session.githubToken, session.user.login);
  const sha = (await gh.getTree()).find((f) => f.path === safePath)?.sha;
  if (!sha) return jsonError(c, "not_found", 404);
  await gh.deleteFile(safePath, sha, `docs: remove ${safePath}`);
  await writeAudit(c.env, session.user, "DELETE_ARTICLE", "article", {
    resourceId: safePath,
    ipHash: await hashValue(c.env, clientIp(c)),
    requestId: c.get("requestId"),
  });
  return c.body(null, 204);
});

app.notFound((c) => jsonError(c, "not_found", 404));

app.onError((error, c) => {
  console.error("Unhandled API error", c.get("requestId"), error);
  return jsonError(c, "internal_error", 500, "Unexpected server error");
});

export const onRequest: PagesFunction<Env> = async (context) => {
  return app.fetch(context.request, context.env);
};
