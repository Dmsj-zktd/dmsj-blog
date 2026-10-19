# Review Round 2 — Supply chain, XSS, privacy, and delivery

- Date: 2026-10-19
- Angle: attacker-controlled text → browser DOM / Markdown renderer / CI artifact → public reader
- Scope: public scripts, response headers, dependency graph, CI and content-link automation

## Findings and resolutions

1. **Production dependency audit failed at the configured registry**
   - Resolution: CI uses the official npm audit endpoint; local verification uses the same.
2. **24 known production vulnerabilities**
   - Initial: 10 high, 9 moderate, 5 low from transitive `undici`, `devalue`, `http-cache-semantics`, `source-map-js`, `smol-toml`, `katex`, `sharp`, and `hono`.
   - Resolution: patched direct Hono and pinned verified upstream overrides to patched releases.
   - Final evidence: `pnpm audit --prod --registry=https://registry.npmjs.org` → **No known vulnerabilities found**.
3. **Search excerpts were inserted through `innerHTML`**
   - Resolution: parse with a detached document, retain text and `<mark>` only, build DOM nodes with `textContent`.
4. **CSP was broader than necessary**
   - Resolution: remove arbitrary HTTPS images; keep Giscus isolated; admin permits Turnstile only; add HSTS and admin `noindex`.
5. **Inline bootstrap needed to avoid theme flash**
   - Resolution: inline the exact pinned theme/lens bootstrap, add its SHA-256 to CSP, and verify the generated HTML hash matches.
6. **Analytics collected more context than needed**
   - Resolution: send only path and referrer; skip local preview, DNT/GPC, save-data, bots, and unavailable APIs.
7. **CI deploy lacked the same build artifact**
   - Resolution: quality job uploads `web-dist`; deploy downloads and publishes that immutable artifact.

## Verification evidence

- Generated inline bootstrap hash: `sha256-OMNTYLyMvpWmXLwuKLt6fo04/IL/3BJQ7FM9QlWcRcg=`; it matches `public/_headers`.
- CSP and HSTS confirmed through local Wrangler Pages output.
- Search/command palette exercised in Chromium and WebKit; no page or console error under Wrangler CSP.
- CodeQL, gitleaks, Dependabot metadata, and link-check schedule are present in `.github/`.

No unresolved critical/high finding from this angle.
