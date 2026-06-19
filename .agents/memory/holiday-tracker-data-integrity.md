---
name: Holiday tracker data integrity
description: Why the holidays table needs a FK cascade and server-side date validation
---

When holidays reference people, the relationship must be enforced or metrics silently corrupt.

**Rule:** `holidays.person_id` must have a FK to `people.id` with `ON DELETE CASCADE`, and all holiday writes (create/update/import) must validate that `startDate <= endDate` and dates are real `YYYY-MM-DD`, plus verify `personId` exists.

**Why:** A code review found that deleting a person left their holiday rows behind, so coverage/conflict counts still counted the deleted person (phantom away-days). Separately, the API accepted `startDate > endDate`, which corrupts coverage logic and can make a booking silently vanish from range queries.

**How to apply:** Any feature that adds a table referencing another entity should add the FK + cascade at the schema level, and any date-range input should be validated server-side, not just in the client zod schema (clients can be bypassed).
