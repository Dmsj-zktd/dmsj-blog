# Vendored design skills

These skills are local instruction snapshots, not runtime dependencies. No page or
API fetches them from the network.

| Local path | Upstream | Revision | Retrieved | License | SHA-256 |
| --- | --- | --- | --- | --- | --- |
| `.agents/skills/frontend-design` | https://github.com/anthropics/skills | `dbd4588f9e1033efb41dad4bef2f7947c8993d44` | 2026-10-18 | See local `LICENSE.txt` | `SKILL.md`: `b8009ae690dfa69edc7f08bb8715f32db8817112cfa4388741dbaf876c237df8` |
| `.agents/skills/web-design-guidelines` | https://github.com/vercel-labs/web-interface-guidelines | `434b7f91364665f2f733b310ec54809bf8f37937` | 2026-10-18 | See local `LICENSE.txt` | `SKILL.md`: `3c85fcec41ee597fbcf740d050ef90a0c528d0d5f75f7615f062ed07d0e1295f`; `references/guidelines.md`: `d9d63639b5f6a376243ffda2b930f0cc91505fd0e0b527376b466c3c6a2c9794` |

## Local modifications

- The Vercel review skill now reads its pinned local reference instead of
  fetching the upstream command file at review time.
- No upstream hooks, binaries, generated datasets, or telemetry are installed.

## Update procedure

1. Review the upstream diff and license.
2. Copy only the instruction and reference files needed by this repository.
3. Recompute SHA-256 hashes and update this lock file.
4. Run the design, accessibility, and browser compatibility checks recorded in
   `docs/design-system.md`.
