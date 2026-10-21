# Signal Lab performance notes

Measured on 2026-10-19 against the production build via the local static server with
Brotli compression, Lighthouse 13.5 mobile simulation.

| Route | Performance | Accessibility | Best Practices | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Home | 100 | 100 | 100 | 100 | 1.4s | 0 | 0ms |
| `synthesis/memory-hierarchy` | 97 | 100 | 100 | 100 | 2.2s | 0 | 0ms |
| `lab/kv-budget` | 100 | 100 | 100 | 100 | 1.6s | 0 | 0ms |

Interpretation:

- The home discovery surface and the long-form article meet the intended Lighthouse
  targets in the production-like local run.
- The article embeds no full interactive lab; the lab remains a separate route so reading is not forced to download the simulation runtime.
- Lab evaluation is split by slug. The shared lab boot script is about 1.9 KiB gzip and
  each on-demand evaluator is under 0.7 KiB gzip, replacing the former 37.8 KiB gzip bundle.
- The local server now negotiates Brotli/gzip and marks fingerprinted assets immutable so
  local measurements do not overstate transfer latency relative to Cloudflare Pages.
- A production header audit on 2026-10-21 found Cloudflare Pages returning
  `max-age=0, must-revalidate` for fingerprinted `/_astro/` files. The deployed policy now
  caches those files for one year, keeps admin assets and Pagefind fragments immutable, and
  gives the stable Pagefind entry files a one-hour browser cache with a one-day
  stale-while-revalidate window. Route HTML remains immediately revalidatable so a publish
  is visible without waiting for a cache purge.
- The KaTeX and Newsreader styles are progressive; without JavaScript a `<noscript>` stylesheet keeps formulas and typography intact.
- Re-run Lighthouse after any layout, font, or article-template change; do not treat these numbers as permanent claims.
