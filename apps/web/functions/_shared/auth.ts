import { PROD_SESSION_COOKIE, parseCookies, SESSION_COOKIE } from "./cookies";
import { randomToken } from "./crypto";
import { type Env, isProd } from "./env";

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
  csrfToken: string;
  createdAt: number;
}

export const sessionKey = (id: string) => `session:${id}`;

export async function createSession(
  env: Env,
  user: SessionUser,
  githubToken: string,
): Promise<Session> {
  if (
    (env.ENVIRONMENT === "production" || env.SITE_URL?.startsWith("https://")) &&
    !env.SESSION_SECRET
  ) {
    throw new Error("SESSION_SECRET is required in production");
  }
  const session: Session = {
    id: randomToken(32),
    user,
    githubToken: await sealToken(env, githubToken),
    csrfToken: randomToken(24),
    createdAt: Date.now(),
  };
  await env.SESSION.put(sessionKey(session.id), JSON.stringify(session), {
    expirationTtl: 60 * 60 * 24 * 7,
  });
  return session;
}

export async function getSession(env: Env, request: Request): Promise<Session | null> {
  const cookies = parseCookies(request);
  const sid = cookies[isProd(env) ? PROD_SESSION_COOKIE : SESSION_COOKIE];
  if (!sid) return null;
  const raw = await env.SESSION.get(sessionKey(sid));
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as Session;
    if (!session.csrfToken) return null;
    return { ...session, githubToken: await openToken(env, session.githubToken) };
  } catch {
    return null;
  }
}

export async function destroySession(env: Env, request: Request): Promise<void> {
  const cookies = parseCookies(request);
  const sid = cookies[isProd(env) ? PROD_SESSION_COOKIE : SESSION_COOKIE];
  if (sid) await env.SESSION.delete(sessionKey(sid));
}

export function checkCsrf(env: Env, request: Request, session: Session): boolean {
  const method = request.method;
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  const token = request.headers.get("x-dmsj-csrf");
  if (!token || token !== session.csrfToken) return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const expected = (env.SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  return origin === expected;
}

function keyMaterial(env: Env): ArrayBuffer {
  const encoded = new TextEncoder().encode(env.SESSION_SECRET ?? "local-session-secret");
  const copy = new Uint8Array(encoded.byteLength);
  copy.set(encoded);
  return copy.buffer;
}

async function aesKey(env: Env): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", keyMaterial(env));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

async function sealToken(env: Env, token: string): Promise<string> {
  if (!env.SESSION_SECRET) return token;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await aesKey(env),
    new TextEncoder().encode(token),
  );
  const encode = (bytes: Uint8Array) =>
    btoa(String.fromCharCode(...bytes))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
  return `v1.${encode(iv)}.${encode(new Uint8Array(encrypted))}`;
}

async function openToken(env: Env, value: string): Promise<string> {
  if (!value.startsWith("v1.")) {
    if (env.SESSION_SECRET || env.ENVIRONMENT === "production") {
      throw new Error("Unencrypted session token rejected");
    }
    return value;
  }
  if (!env.SESSION_SECRET) throw new Error("SESSION_SECRET missing");
  const [, ivPart, cipherPart] = value.split(".");
  const decode = (part: string) =>
    Uint8Array.from(atob(part.replaceAll("-", "+").replaceAll("_", "/")), (char) =>
      char.charCodeAt(0),
    );
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: decode(ivPart ?? "") },
    await aesKey(env),
    decode(cipherPart ?? ""),
  );
  return new TextDecoder().decode(decrypted);
}
