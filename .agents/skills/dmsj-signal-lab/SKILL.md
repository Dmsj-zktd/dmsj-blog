---
name: dmsj-signal-lab
description: Build or review the DMSJ Signal Lab Astro blog. Use for changes to its public research UI, article reading experience, lab visualizations, or design-system constraints; not for unrelated blogs or generic framework questions.
---

# DMSJ Signal Lab

Preserve the repository's content-first signal-lab identity.

## Read first

- Root `AGENTS.md` for non-negotiable architecture and validation gates.
- `docs/design-system.md` for tokens and density rules.
- `docs/design/reference-ledger.md` for transferable, not copied, references.
- `.agents/skills/web-design-guidelines/references/guidelines.md` for UI review.

## Visual contract

- One design language with two densities: the Signal Lab discovery surface and the
  Research Journal reading surface.
- Use the existing semantic tokens in `apps/web/src/styles/global.css`. Blue means
  reasoning/AI; orange means silicon/embedded. Do not introduce another brand accent
  or hard-code theme colors in components.
- Instrument Sans carries UI and headings. Newsreader carries long-form Latin prose.
  Chinese uses the configured system stack. Code uses the system mono stack.
- The Signal Map, evidence rail, and lab model are the distinctive gestures. Keep
  adjacent chrome quiet.
- Motion should clarify a state change or reveal in 120–360 ms. Respect
  `prefers-reduced-motion`; never make animation the only carrier of information.
- Every interactive figure must have a complete static result and an accessible
  text or table equivalent. No WebGL, scroll hijacking, or fake live data.
- Follow WCAG 2.2 AA, visible focus, 44 px touch targets, 200% zoom, forced colors,
  and normal navigation when View Transitions or JavaScript are unavailable.

## Content contract

- Git Markdown is the source of truth. Homepage and archive layouts must derive from
  the content registry and article metadata, not hard-coded post lists.
- Research notes identify a core question, bounded conclusion, maturity, evidence
  level, sources, verification date, and any limitation. Simulations are never
  described as hardware measurements.
- Lab slugs must exist in the registered lab catalogue. A content file cannot load
  arbitrary executable code.
- Preserve existing slugs and public URLs when editing old notes.

## Review workflow

1. Inspect the affected page at 390, 768, and 1440 px before changing it.
2. Make the smallest coherent visual or behavioral change.
3. Check keyboard flow, reduced motion, no-JS rendering, and horizontal overflow.
4. Run `pnpm check`, the relevant tests, and `pnpm build`.
5. For a visual change, capture the affected route in light and dark modes and compare
   it with the reference principles above.

If a proposed flourish does not help a reader find, understand, or verify content,
remove it.
