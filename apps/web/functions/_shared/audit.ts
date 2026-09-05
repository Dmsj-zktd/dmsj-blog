import type { SessionUser } from "./auth";
import type { Env } from "./env";

export async function writeAudit(
  env: Env,
  actor: SessionUser | { login: string; id?: number },
  action: string,
  resource: string,
  opts: {
    resourceId?: string;
    success?: boolean;
    ipHash?: string | null;
    details?: unknown;
  } = {},
): Promise<void> {
  const { success = true } = opts;
  await env.DB.prepare(
    `INSERT INTO audit_logs (ts, actor, action, resource, resource_id, success, ip_hash, details)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      Date.now(),
      actor.login,
      action,
      resource,
      opts.resourceId ?? null,
      success ? 1 : 0,
      opts.ipHash ?? null,
      opts.details ? JSON.stringify(opts.details) : null,
    )
    .run();
}
