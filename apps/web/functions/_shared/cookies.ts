import type { Env } from "./env";
import { isProd } from "./env";

export const SESSION_COOKIE = "dmsj_sid";
export const PROD_SESSION_COOKIE = "__Host-dmsj_sid";
export const OAUTH_COOKIE = "dmsj_oauth";

export function sessionCookieName(env: Env): string {
  return isProd(env) ? PROD_SESSION_COOKIE : SESSION_COOKIE;
}

export function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get("cookie") ?? "";
  const result: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    try {
      result[key] = decodeURIComponent(part.slice(idx + 1).trim());
    } catch {
      // A malformed cookie must not turn an otherwise valid request into a 500.
    }
  }
  return result;
}

export function cookieHeader(env: Env, value: string, maxAgeSeconds: number): string {
  const secure = isProd(env) ? "; Secure" : "";
  return `${sessionCookieName(env)}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`;
}

export function clearCookieHeader(env: Env): string {
  const secure = isProd(env) ? "; Secure" : "";
  return `${sessionCookieName(env)}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

export function oauthCookieHeader(env: Env, value: string): string {
  const secure = isProd(env) ? "; Secure" : "";
  return `${OAUTH_COOKIE}=${encodeURIComponent(value)}; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=600${secure}`;
}

export function clearOAuthCookieHeader(env: Env): string {
  const secure = isProd(env) ? "; Secure" : "";
  return `${OAUTH_COOKIE}=; Path=/api/auth; HttpOnly; SameSite=Lax; Max-Age=0${secure}`;
}
