---
name: Tailwind CSS @import order
description: Google Fonts @import must precede Tailwind @imports in index.css
---

**Rule:** In a Vite + Tailwind v4 entry CSS (e.g. `src/index.css`), any `@import url(...)` for web fonts must come BEFORE `@import "tailwindcss";` and other `@import`s.

**Why:** CSS spec requires `@import` statements to precede all other rules (besides `@charset`/empty `@layer`). Tailwind injects rules, so a font `@import` placed after it makes the build fail with "@import must precede all other statements".

**How to apply:** When a design subagent or generated CSS puts a Google Fonts import lower in the file, move it to the very top.
