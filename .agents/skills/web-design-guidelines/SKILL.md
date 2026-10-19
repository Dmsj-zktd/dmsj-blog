---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Read [references/guidelines.md](references/guidelines.md), the pinned local snapshot.
2. Read the specified files (or ask for a file or pattern).
3. Check against all rules in the local snapshot.
4. Output findings in the terse `file:line` format.

## Guidelines Source

The source is pinned in `docs/design/vendor-lock.md`. Do not fetch remote guidelines
during a review; this repository must remain reviewable offline and deterministic.

## Usage

When a user provides a file or pattern argument:
1. Read the pinned local guideline snapshot.
2. Read the specified files.
3. Apply all rules from the local snapshot.
4. Output findings using the format specified in the guidelines

If no files specified, ask the user which files to review.
