import type { Env } from "./env";
import { hashValue, isoDayFromTs } from "./crypto";

const BOT_RE =
  /bot|crawler|spider|slurp|headless|curl|wget|python-requests|go-http-client|facebookexternalhit|telegrambot/i;

export interface TrackInput {
  path: string;
  referrer: string;
  ua: string;
  ip: string;
  country: string | null;
}

export function parseClient(ua: string) {
  let browser = "unknown";
  if (/edg(e|a)?\//i.test(ua)) browser = "Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/chrome|crios/i.test(ua)) browser = "Chrome";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/safari/i.test(ua)) browser = "Safari";
  else if (/micromessenger/i.test(ua)) browser = "WeChat";

  let os = "unknown";
  if (/windows/i.test(ua)) os = "Windows";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ios/i.test(ua)) os = "iOS";
  else if (/mac os x|macintosh/i.test(ua)) os = "macOS";
  else if (/linux/i.test(ua)) os = "Linux";

  let device = "desktop";
  if (/ipad|tablet/i.test(ua)) device = "tablet";
  else if (/iphone|ipod|android.*mobile|mobi/i.test(ua)) device = "mobile";

  return { browser, os, device };
}

function safePath(value: string): string {
  return value.slice(0, 600).replace(/[\u0000-\u001f]/g, "");
}

function referrerHost(value: string): string | null {
  if (!value || !value.startsWith("http")) return null;
  try {
    return new URL(value).hostname.slice(0, 200);
  } catch {
    return null;
  }
}

export async function recordPageView(
  env: Env,
  input: TrackInput,
): Promise<"ok" | "bot" | "limited"> {
  if (BOT_RE.test(input.ua)) return "bot";
  const ipHash = await hashValue(env, input.ip);
  const now = Date.now();
  const offsetMinutes = Number(env.ANALYTICS_TZ_MINUTES ?? "480");
  const day = isoDayFromTs(now, offsetMinutes);
  const referrer = referrerHost(input.referrer);
  const parsed = parseClient(input.ua);
  const browser = parsed.browser;
  const os = parsed.os;
  const device = parsed.device;

  await env.DB.prepare(
    `INSERT INTO page_view_events
      (ts, day, path, country, referrer_host, browser, os, device, ip_hash, bot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
  )
    .bind(
      now,
      day,
      safePath(input.path),
      input.country,
      referrer,
      browser,
      os,
      device,
      ipHash,
    )
    .run();

  await env.DB.prepare(
    `INSERT INTO page_view_daily
      (day, path, country, referrer_host, browser, os, device, views)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)
     ON CONFLICT(day, path, country, referrer_host, browser, os, device)
     DO UPDATE SET views = views + 1`,
  )
    .bind(
      day,
      safePath(input.path),
      input.country ?? "unknown",
      referrer ?? "direct",
      browser,
      os,
      device,
    )
    .run();

  await maybeCleanup(env, now);
  return "ok";
}

async function maybeCleanup(env: Env, now: number): Promise<void> {
  const flag = "cleanup:page_views";
  const last = Number((await env.SESSION.get(flag)) ?? "0");
  if (now - last < 86_400_000) return;
  const cutoff = now - 180 * 86_400_000;
  const cutoffDay = isoDayFromTs(cutoff, Number(env.ANALYTICS_TZ_MINUTES ?? "480"));
  await env.DB.prepare("DELETE FROM page_view_events WHERE ts < ?").bind(cutoff).run();
  await env.DB.prepare("DELETE FROM page_view_daily WHERE day < ?").bind(cutoffDay).run();
  await env.SESSION.put(flag, String(now), { expirationTtl: 86_400 });
}
