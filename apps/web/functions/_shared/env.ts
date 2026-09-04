export interface Env {
  DB: D1Database;
  SESSION: KVNamespace;
  ENVIRONMENT?: string;
  IP_SALT?: string;
  SITE_URL?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
  ALLOWED_GITHUB_LOGIN?: string;
  REPO_OWNER?: string;
  REPO_NAME?: string;
  REPO_BRANCH?: string;
  TURNSTILE_SECRET_KEY?: string;
  /** 统计日界使用的时区偏移（分钟，默认 +08:00） */
  ANALYTICS_TZ_MINUTES?: string;
}

export const isProd = (env: Env) => env.ENVIRONMENT === "production";
