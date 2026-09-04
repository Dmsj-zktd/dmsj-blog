import { isProd } from "./env";
import type { Env } from "./env";

export const SESSION_COOKIE = "dmsj_sid";

export function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get("cookie") ?? "";
  const result: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    result[key] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return result;
}

export function cookieHeader(
  env: Env,
  value: string,
  maxAgeSeconds: number,
): string {
  const secure = isProd(env) ? "; Secure" : "";
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`;
}

export function clearCookieHeader(env: Env): string {
  const secure = isProd(env) ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
