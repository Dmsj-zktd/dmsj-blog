import { SESSION_COOKIE, parseCookies } from "./cookies";
import type { Env } from "./env";
import { randomToken } from "./crypto";

export interface SessionUser {
  id: number;
  login: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface Session {
  id: string;
  user: SessionUser;
  githubToken: string;
  createdAt: number;
}

export const sessionKey = (id: string) => `session:${id}`;

export async function createSession(
  env: Env,
  user: SessionUser,
  githubToken: string,
): Promise<Session> {
  const session: Session = {
    id: randomToken(32),
    user,
    githubToken,
    createdAt: Date.now(),
  };
  await env.SESSION.put(sessionKey(session.id), JSON.stringify(session), {
    expirationTtl: 60 * 60 * 24 * 7,
  });
  return session;
}

export async function getSession(
  env: Env,
  request: Request,
): Promise<Session | null> {
  const cookies = parseCookies(request);
  const sid = cookies[SESSION_COOKIE];
  if (!sid) return null;
  const raw = await env.SESSION.get(sessionKey(sid));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

export async function destroySession(env: Env, request: Request): Promise<void> {
  const cookies = parseCookies(request);
  const sid = cookies[SESSION_COOKIE];
  if (sid) await env.SESSION.delete(sessionKey(sid));
}

export function checkCsrf(env: Env, request: Request): boolean {
  const method = request.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  if (request.headers.get("x-dmsj-csrf") !== "1") return false;
  const origin = request.headers.get("origin");
  if (!origin) return true;
  const allowed = (env.SITE_URL ?? "").replace(/\/$/, "");
  if (!allowed) return true;
  return origin === allowed;
}
