---
name: React Hook Form dialog reset
description: Reusable dialogs must reset() on open/target change or they show stale data
---

**Rule:** A shared dialog that wraps a `useForm` and is reused for create/edit of different records must call `form.reset(...)` in a `useEffect` keyed on `[open, record?.id, ...other defaults]`. Do not rely on `defaultValues` alone.

**Why:** React Hook Form `defaultValues` are captured once at mount and are NOT reactive. A persistent dialog opened for record A then record B will display A's values and can submit the wrong data.

**How to apply:** Whenever a dialog/form component persists across multiple open cycles with different props, add the reset effect. Guard with `if (!open) return;` to avoid resetting while closing.
