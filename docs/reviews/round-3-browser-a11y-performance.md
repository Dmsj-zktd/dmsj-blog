# Review Round 3 — Browser, accessibility, performance, and content truth

- Date: 2026-10-19
- Angle: rendered experience under constrained clients, keyboard/no-JS/reduced-motion contexts, and factual claims
- Scope: built site, article labs, mobile layout, visual baselines, source metadata

## Findings and resolutions

1. **Search trigger had no accessible name at icon-only mobile widths.**
   - Resolution: explicit `aria-label`; Lighthouse accessibility moved to 100 on the tested pages.
2. **Article page loaded a full lab island below the fold.**
   - Resolution: replace the embedded lab with a compact evidence-bound teaser and keep the complete interactive instrument on `/lab/{slug}/`.
3. **KaTeX and Research Journal font CSS competed with initial rendering.**
   - Resolution: load formula and reading-font CSS asynchronously with a no-JS fallback; preload and verify the UI font.
4. **Initial scroll measurement forced layout.**
   - Resolution: defer reading progress calculations to `requestAnimationFrame`.
5. **Outdated source URLs were found by the link checker.**
   - Resolution: replace the 404 Linux and FreeRTOS URLs; classify bot-protected/rate-limited sites separately from broken links.

## Verification evidence

- Playwright Chromium + WebKit: smoke, mode switching, search, lab updates, no-JS reading, reduced motion, mobile 320px, and admin entry pass.
- Axe: no serious/critical WCAG 2.2 AA violations on the tested public routes.
- Visual regression: 18 Chromium baselines across 390/768/1440 for home, frontier, article, lab, about, and admin.
- Lighthouse mobile (local production build):
  - Home: Performance 97, Accessibility 100, Best Practices 100, SEO 100; LCP 1.7s, CLS 0.
  - Synthesis article: Performance 93, Accessibility 100, Best Practices 100, SEO 100; LCP 2.6s, CLS 0.
- Firefox could not launch on this Windows host because its Playwright binary reports a missing Side-by-Side runtime; the GitHub Linux CI matrix installs and runs Firefox.
- No fourth review round is scheduled because the remaining delta is the platform-specific Firefox execution and a 0.1s article LCP variance, not an unexamined code change.
