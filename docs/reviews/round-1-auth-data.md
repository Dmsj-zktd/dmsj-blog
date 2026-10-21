# Review Round 1 — Authentication, authorization, and content paths

- Date: 2026-10-19
- Change-set fingerprint at review start: `e1b2473861ac360d336e829f15b05a1eac2c4dafe9ffe5a61deabc1f7423b83d`
- Angle: browser session → OAuth callback → GitHub API / D1 / KV → published file path
- Scope: `apps/web/functions/**`, `apps/web/drizzle/**`, session and content validation tests

## Findings and resolutions

1. **OAuth login CSRF**
   - Resolution: bind a random verifier to both the OAuth state entry and a short-lived `HttpOnly` cookie; compare both on callback and clear the OAuth cookie after use.
2. **Weak CSRF for admin writes**
   - Resolution: generate a session-bound CSRF token, return it from `/api/auth/me`, require exact `x-dmsj-csrf` value and a same-origin `Origin`.
3. **Production configuration could degrade open**
   - Resolution: require `ALLOWED_GITHUB_LOGIN`, `IP_SALT`, and `SESSION_SECRET`; admin/login returns `503 server_not_configured` when incomplete. Analytics fails closed without breaking public navigation.
4. **GitHub token stored as plaintext in KV**
   - Resolution: encrypt with AES-GCM using a key derived from `SESSION_SECRET`; invalid/legacy session data is rejected rather than trusted.
5. **Repository path abuse**
   - Resolution: domain allowlist, URL-safe segments, canonical `apps/web/content/**/*.md(x)` path validation, and an exact file-tree conflict check before publish.
6. **Malformed cookie could produce a 500**
   - Resolution: reject malformed percent encoding safely; regression test added.
7. **NaN, impossible dates, and unbounded page parameters**
   - Resolution: real calendar-date validation and bounded integer parsing.
8. **Audit coverage gaps**
   - Resolution: audit schema accepts request IDs; failed auth/publish paths remain audited.

## Verification evidence

- `pnpm test` — 23 tests passed, including path, production-config, cookie, content, and lab regressions.
- Local Wrangler Pages Functions:
  - `GET /api/auth/me` → `200 {"user":null}`
  - `GET /api/auth/config` → `200`
  - unauthenticated `/api/admin/*` and logout → `401`
  - `POST /api/track` → `204`
- Local D1 migrations `0001` and `0002` applied successfully.

No unresolved critical/high finding from this angle.
