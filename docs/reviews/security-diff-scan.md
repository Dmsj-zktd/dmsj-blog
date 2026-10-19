# Codex Security diff scan

- Date: 2026-10-19
- Snapshot: `codex-security-snapshot/v1:sha256:f07fe0ba5d496da2e9739feb84c2106225c41305aa718dc8c14113a30c6ee9f3`
- Coverage: 64/64 review items, complete working-tree diff
- Result before remediation: 2 low findings, plus defense-in-depth observations

## Findings and resolutions

1. **Production configuration could fall back to development behavior**
   - Cause: `isProd` required optional `ENVIRONMENT` or `SITE_URL` markers.
   - Resolution: only `ENVIRONMENT=development` selects development behavior. Empty,
     missing, preview, and production environments now fail closed.
   - Added regression coverage for an empty environment and a stronger cookie-name
     selection that does not accept the development cookie in production.

2. **OAuth state creation had no rate limit**
   - Cause: `/api/auth/login-start` wrote a KV verifier for every anonymous request.
   - Resolution: limit login starts to 30 per client IP per hour before KV writes;
     excess requests return the structured `rate_limited` 429 error.
   - Added a route test proving a limited request does not write another KV value.

## Defense-in-depth changes

- JSON-LD is serialized with `<`, U+2028, and U+2029 escaped before `set:html`.
- Primary-source URLs accept only `http:` and `https:` schemes.
- Draft related-note paths use the same canonical slug rules as published content.
- Draft updates now check the D1 conditional-update row count, closing a lost-update
  race instead of reporting a successful save after a stale version.
- Publishing deletes the source draft only when its version still matches. A newer
  draft is retained rather than overwritten.
- Failed authenticated admin mutations are audited with request ID, method, and status;
  secrets and request bodies are not recorded.
- CSV formula detection also covers leading whitespace/control characters.

## Verification after remediation

- `pnpm check`: 0 errors, 0 warnings.
- `pnpm test`: 36/36 tests.
- `pnpm lint`: passed.
- `pnpm build`: 155 pages; Pagefind indexed 30 articles and 5 filters.
- `pnpm test:e2e`: 40/40 Chromium + WebKit.
- `pnpm test:a11y`: 12/12; no serious/critical axe violations.
- `pnpm test:visual`: 18/18.
- Local Pages Functions smoke: `/api/auth/me` 200, `/api/auth/config` 200,
  unauthenticated admin write 401, analytics beacon 204, login start 200 with
  `Set-Cookie` and request ID.
