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
import { clearCookieHeader, cookieHeader } from "../_shared/cookies";
import { dayRangeEpochMs, hashValue, isValidDay, randomToken } from "../_shared/crypto";
import { toCsv } from "../_shared/csv";
import type { Env } from "../_shared/env";
import { buildGitHubClient, type GitHubClient } from "../_shared/github";
import { rateLimit } from "../_shared/rate";

type AppEnv = {
  Bindings: Env;
  Variables: {
    session: Session;
  };
};

const app = new Hono<AppEnv>();

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

app.use("*", async (c, next) => {
  await next();
  const headers = c.res.headers;
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
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
  const ip = clientIp(c);
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
  const result = await recordPageView(c.env, { path, referrer, ua, ip, country });
  return c.body(null, result === "ok" ? 204 : 204);
});

/* ---------------- 认证：GitHub OAuth ---------------- */

const loginSchema = z.object({
  turnstileToken: z.string().optional(),
});

app.post("/api/auth/login-start", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return json({ error: "invalid_request" }, 400);

  const clientId = c.env.GITHUB_CLIENT_ID;
  const clientSecret = c.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return json({ error: "github_oauth_not_configured" }, 503);
  }

  if (c.env.TURNSTILE_SECRET_KEY) {
    const token = parsed.data.turnstileToken;
    if (!token) return json({ error: "turnstile_required" }, 400);
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
    if (!check.success) return json({ error: "turnstile_failed" }, 403);
  }

  const state = randomToken(16);
  await c.env.SESSION.put(`oauth:state:${state}`, "1", {
    expirationTtl: 600,
  });
  const redirectUri = `${originOf(c)}/api/auth/callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user public_repo",
    state,
  });
  return json({ url: `https://github.com/login/oauth/authorize?${params}` });
});

app.get("/api/auth/callback", async (c) => {
  const code = c.req.query("code") ?? "";
  const state = c.req.query("state") ?? "";
  const stored = await c.env.SESSION.get(`oauth:state:${state}`);
  if (!code || !state || !stored) {
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

  const allowLogin = c.env.ALLOWED_GITHUB_LOGIN;
  if (allowLogin && user.login !== allowLogin) {
    await writeAudit(c.env, user, "LOGIN_DENIED", "auth", {
      ipHash: await hashValue(c.env, clientIp(c)),
      success: false,
    });
    return c.redirect(`${originOf(c)}/admin/?error=denied`);
  }

  const session = await createSession(c.env, user, tokenBody.access_token);
  await writeAudit(c.env, user, "LOGIN", "auth", {
    resourceId: session.id,
    ipHash: await hashValue(c.env, clientIp(c)),
  });
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${originOf(c)}/admin/`,
      "Set-Cookie": cookieHeader(c.env, session.id, 60 * 60 * 24 * 7),
    },
  });
});

app.get("/api/auth/me", async (c) => {
  const session = await getSession(c.env, c.req.raw);
  if (!session) return json({ user: null });
  return json({ user: session.user });
});

app.post("/api/auth/logout", async (c) => {
  const session = await getSession(c.env, c.req.raw);
  if (!session || !checkCsrf(c.env, c.req.raw)) {
    return json({ error: "unauthorized" }, 401);
  }
  await destroySession(c.env, c.req.raw);
  if (session) {
    await writeAudit(c.env, session.user, "LOGOUT", "auth", {
      resourceId: session.id,
    });
  }
  return new Response(null, {
    status: 204,
    headers: { "Set-Cookie": clearCookieHeader(c.env) },
  });
});

/* ---------------- Admin 鉴权中间件 ---------------- */

app.use("/api/admin/*", async (c, next) => {
  const session = await getSession(c.env, c.req.raw);
  if (!session) return json({ error: "unauthorized" }, 401);
  c.set("session", session);
  if (c.req.method !== "GET" && !checkCsrf(c.env, c.req.raw)) {
    return json({ error: "csrf_failed" }, 403);
  }
  await next();
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

function requireDateRange(query: Record<string, string>) {
  const from = query.from ?? "";
  const to = query.to ?? "";
  if (!isValidDay(from) || !isValidDay(to)) {
    return { error: json({ error: "invalid_date_range" }, 400) };
  }
  if (from > to) return { error: json({ error: "invalid_date_range" }, 400) };
  return { from, to };
}

app.get("/api/admin/analytics/overview", async (c) => {
  const query = c.req.query();
  const range = requireDateRange(query);
  if ("error" in range) return range.error;
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
  if ("error" in range) return range.error;
  const group = (query.group ?? "path") as keyof typeof groupColumns;
  const column = groupColumns[group];
  if (!column) return json({ error: "invalid_group" }, 400);
  const q = (query.q ?? "").trim().slice(0, 200);
  const pageSize = Math.min(Number(query.pageSize ?? "20"), 100);
  const page = Math.max(Number(query.page ?? "1"), 1);
  const offset = (page - 1) * pageSize;
  const sql = `
    SELECT ${column} AS key, SUM(views) AS views
    FROM page_view_daily
    WHERE day BETWEEN ? AND ? ${q ? "AND path LIKE ?" : ""}
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
      WHERE day BETWEEN ? AND ? ${q ? "AND path LIKE ?" : ""}
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
  if ("error" in range) return range.error;
  const pageSize = Math.min(Number(c.req.query("pageSize") ?? "50"), 200);
  const page = Math.max(Number(c.req.query("page") ?? "1"), 1);
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
  if (!session) return json({ error: "unauthorized" }, 401);
  const gh = buildGitHubClient(c.env, session.githubToken, session.user.login);
  const files = await gh.getTree().catch(() => []);
  const drafts = await c.env.DB.prepare(
    `SELECT id, domain, dirs, slug, title, description, tags_json AS tagsJson,
            series, lang, updated_at AS updatedAt
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
    })),
  });
});

const draftSchema = z.object({
  id: z.string().optional(),
  domain: z.string().min(1).max(40),
  dirs: z
    .array(z.string().regex(/^[a-z0-9-]+$/))
    .max(6)
    .default([]),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(80),
  title: z.string().min(1).max(120),
  description: z.string().min(1).max(320),
  tags: z.array(z.string().trim().min(1)).max(12).default([]),
  series: z.string().optional(),
  lang: z.string().default("zh-CN"),
  body: z.string().min(1).max(500_000),
});

app.post("/api/admin/drafts", async (c) => {
  const session = sessionOf(c);
  if (!session) return json({ error: "unauthorized" }, 401);
  const parsed = draftSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues }, 400);
  const data = parsed.data;
  const id = data.id ?? randomToken(16);
  const now = Date.now();
  const existing = await c.env.DB.prepare("SELECT 1 FROM drafts WHERE id = ?").bind(id).first();
  if (existing) {
    await c.env.DB.prepare(
      `UPDATE drafts SET domain=?, dirs=?, slug=?, title=?, description=?, tags_json=?,
       series=?, lang=?, body=?, updated_at=? WHERE id=?`,
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
        now,
        id,
      )
      .run();
  } else {
    await c.env.DB.prepare(
      `INSERT INTO drafts
       (id, domain, dirs, slug, title, description, tags_json, series, lang, body, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        now,
        now,
      )
      .run();
  }
  await writeAudit(c.env, session.user, "UPSERT_DRAFT", "article", {
    resourceId: id,
    ipHash: await hashValue(c.env, clientIp(c)),
  });
  return json({ id });
});

app.get("/api/admin/drafts/:id", async (c) => {
  const session = sessionOf(c);
  if (!session) return json({ error: "unauthorized" }, 401);
  const row = await c.env.DB.prepare(
    `SELECT id, domain, dirs, slug, title, description, tags_json AS tagsJson,
            series, lang, body, updated_at AS updatedAt
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
      updatedAt: number;
    }>();
  if (!row) return json({ error: "not_found" }, 404);
  return json({ ...row, dirs: JSON.parse(row.dirs), tags: JSON.parse(row.tagsJson) });
});

app.delete("/api/admin/drafts/:id", async (c) => {
  const session = sessionOf(c);
  if (!session) return json({ error: "unauthorized" }, 401);
  const id = c.req.param("id");
  await c.env.DB.prepare("DELETE FROM drafts WHERE id = ?").bind(id).run();
  await writeAudit(c.env, session.user, "DELETE_DRAFT", "article", {
    resourceId: id,
    ipHash: await hashValue(c.env, clientIp(c)),
  });
  return c.body(null, 204);
});

function yamlString(value: string): string {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("\n", " ")}"`;
}

function buildMarkdown(draft: {
  domain: string;
  dirs: string[];
  slug: string;
  title: string;
  description: string;
  tags: string[];
  series?: string;
  lang: string;
  body: string;
}): string {
  const frontmatter = [
    "---",
    `title: ${yamlString(draft.title)}`,
    `description: ${yamlString(draft.description)}`,
    `date: ${new Date().toISOString().slice(0, 10)}`,
    `tags: [${draft.tags.map((tag) => yamlString(tag)).join(", ")}]`,
    draft.series ? `series: ${yamlString(draft.series)}` : "",
    `lang: ${yamlString(draft.lang)}`,
    "draft: false",
    "---",
    "",
    draft.body.trim(),
    "",
  ]
    .filter((line) => line !== "")
    .join("\n");
  return `\n${frontmatter}\n`;
}

app.post("/api/admin/drafts/:id/publish", async (c) => {
  const session = sessionOf(c);
  if (!session) return json({ error: "unauthorized" }, 401);
  const row = await c.env.DB.prepare(
    `SELECT id, domain, dirs, slug, title, description, tags_json AS tagsJson,
            series, lang, body FROM drafts WHERE id = ?`,
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
    }>();
  if (!row) return json({ error: "not_found" }, 404);
  const draft = {
    ...row,
    dirs: JSON.parse(row.dirs) as string[],
    tags: JSON.parse(row.tagsJson) as string[],
    series: row.series ?? undefined,
  };
  const path = `content/${draft.domain}/${draft.dirs.length ? `${draft.dirs.join("/")}/` : ""}${draft.slug}.md`;
  const gh = buildGitHubClient(c.env, session.githubToken, session.user.login);
  try {
    const tree = await gh.getTree();
    const existing = tree.find((file) => file.path === path);
    await gh.putFile(
      path,
      buildMarkdown(draft),
      `docs(${draft.domain}): publish ${draft.slug}`,
      existing?.sha,
    );
  } catch (error) {
    await writeAudit(c.env, session.user, "PUBLISH_FAILED", "article", {
      resourceId: row.id,
      success: false,
      ipHash: await hashValue(c.env, clientIp(c)),
      details: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "publish_failed" }, 502);
  }
  await c.env.DB.prepare("DELETE FROM drafts WHERE id = ?").bind(row.id).run();
  await writeAudit(c.env, session.user, "PUBLISH", "article", {
    resourceId: path,
    ipHash: await hashValue(c.env, clientIp(c)),
  });
  return json({ path });
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
  if (!session) return json({ error: "unauthorized" }, 401);
  const parsed = rawArticleSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues }, 400);
  const data = parsed.data;
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
  });
  return json({ ok: true });
});

app.put("/api/admin/article", async (c) => {
  const session = sessionOf(c);
  if (!session) return json({ error: "unauthorized" }, 401);
  const parsed = publishedWriteSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return json({ error: parsed.error.issues }, 400);
  const data = parsed.data;
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
  });
  return json({ ok: true });
});

app.get("/api/admin/article", async (c) => {
  const session = sessionOf(c);
  if (!session) return json({ error: "unauthorized" }, 401);
  const path = c.req.query("path") ?? "";
  if (!path.startsWith("content/")) return json({ error: "invalid_path" }, 400);
  const gh = buildGitHubClient(c.env, session.githubToken, session.user.login);
  const content = await gh.getRawFile(path).catch(() => null);
  if (content === null) return json({ error: "not_found" }, 404);
  return json({ path, content });
});

app.delete("/api/admin/article", async (c) => {
  const session = sessionOf(c);
  if (!session) return json({ error: "unauthorized" }, 401);
  const path = c.req.query("path") ?? "";
  if (!path.startsWith("content/")) return json({ error: "invalid_path" }, 400);
  const gh = buildGitHubClient(c.env, session.githubToken, session.user.login);
  const sha = (await gh.getTree()).find((f) => f.path === path)?.sha;
  if (!sha) return json({ error: "not_found" }, 404);
  await gh.deleteFile(path, sha, `docs: remove ${path}`);
  await writeAudit(c.env, session.user, "DELETE_ARTICLE", "article", {
    resourceId: path,
    ipHash: await hashValue(c.env, clientIp(c)),
  });
  return c.body(null, 204);
});

app.notFound(() => json({ error: "not_found" }, 404));

export const onRequest: PagesFunction<Env> = async (context) => {
  return app.fetch(context.request, context.env);
};
