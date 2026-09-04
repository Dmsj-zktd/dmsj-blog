import type { Env } from "./env";

/**
 * 基于 KV 的朴素滑动计数限流。不追求绝对精确，
 * 只用于阻止自动化刷接口。
 */
export async function rateLimit(
  env: Env,
  scope: string,
  keyPart: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const key = `rl:${scope}:${hashKeyPart(keyPart)}:${Math.floor(Date.now() / (windowSeconds * 1000))}`;
  const current = Number((await env.SESSION.get(key)) ?? "0");
  if (current >= limit) return false;
  await env.SESSION.put(key, String(current + 1), {
    expirationTtl: windowSeconds,
  });
  return true;
}

function hashKeyPart(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}
