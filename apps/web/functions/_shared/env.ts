export interface Env {
  DB: D1Database;
  SESSION: KVNamespace;
  ENVIRONMENT?: string;
  IP_SALT?: string;
  SESSION_SECRET?: string;
  SITE_URL?: string;
  CF_PAGES?: string;
  CF_PAGES_BRANCH?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  ALLOWED_GITHUB_LOGIN?: string;
  REPO_OWNER?: string;
  REPO_NAME?: string;
  REPO_BRANCH?: string;
  TURNSTILE_SECRET_KEY?: string;
  TURNSTILE_SITE_KEY?: string;
  /** 统计日界使用的时区偏移（分钟，默认 +08:00） */
  ANALYTICS_TZ_MINUTES?: string;
}

/**
 * Fail closed: only the explicit local development environment may use demo
 * secrets, non-Secure cookies, or the legacy non-Host session name. Preview and
 * production deployments must provide the same security configuration.
 */
export const isProd = (env: Env) => env.ENVIRONMENT !== "development";
