import { isProd } from "./env";
import type { Env } from "./env";

export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hashValue(env: Env, value: string): Promise<string> {
  const salt = env.IP_SALT ?? (isProd(env) ? "prod-salt" : "local-salt");
  const data = new TextEncoder().encode(`${salt}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function nowIsoDay(offsetMinutes: number): string {
  const shifted = new Date(Date.now() + offsetMinutes * 60_000);
  return shifted.toISOString().slice(0, 10);
}

export function isoDayFromTs(ts: number, offsetMinutes: number): string {
  const shifted = new Date(ts + offsetMinutes * 60_000);
  return shifted.toISOString().slice(0, 10);
}

export function dayRangeEpochMs(from: string, to: string, offsetMinutes: number) {
  const start = new Date(`${from}T00:00:00Z`).getTime() - offsetMinutes * 60_000;
  const end =
    new Date(`${to}T00:00:00Z`).getTime() + 86_400_000 - offsetMinutes * 60_000;
  return { start, end };
}

export const isValidDay = (value: unknown): value is string =>
  typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
