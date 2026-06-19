import { Router, type IRouter } from "express";
import { and, eq, gte, lte } from "drizzle-orm";
import { db, holidaysTable, peopleTable } from "@workspace/db";
import { validateDateRange } from "../lib/dates";
import {
  CreateHolidayBody,
  UpdateHolidayParams,
  UpdateHolidayBody,
  DeleteHolidayParams,
  ListHolidaysQueryParams,
  ListHolidaysResponse,
  UpdateHolidayResponse,
  ImportHolidaysBody,
  ImportHolidaysResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/holidays", async (req, res): Promise<void> => {
  const query = ListHolidaysQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const conditions = [];
  if (query.data.from) {
    conditions.push(gte(holidaysTable.endDate, query.data.from));
  }
  if (query.data.to) {
    conditions.push(lte(holidaysTable.startDate, query.data.to));
  }
  if (query.data.personId != null) {
    conditions.push(eq(holidaysTable.personId, query.data.personId));
  }

  const rows = await db
    .select()
    .from(holidaysTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(holidaysTable.startDate);

  res.json(ListHolidaysResponse.parse(rows));
});

router.post("/holidays", async (req, res): Promise<void> => {
  const parsed = CreateHolidayBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const dateError = validateDateRange(parsed.data.startDate, parsed.data.endDate);
  if (dateError) {
    res.status(400).json({ error: dateError });
    return;
  }

  const person = await db
    .select({ id: peopleTable.id })
    .from(peopleTable)
    .where(eq(peopleTable.id, parsed.data.personId));
  if (person.length === 0) {
    res.status(400).json({ error: "personId does not reference an existing person" });
    return;
  }

  const [holiday] = await db
    .insert(holidaysTable)
    .values({
      personId: parsed.data.personId,
      startDate: parsed.data.startDate,
      endDate: parsed.data.endDate,
      type: parsed.data.type ?? "annual",
      notes: parsed.data.notes ?? null,
    })
    .returning();

  res.status(201).json(UpdateHolidayResponse.parse(holiday));
});

router.post("/holidays/import", async (req, res): Promise<void> => {
  const parsed = ImportHolidaysBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const people = await db.select().from(peopleTable);
  const lookup = new Map<string, number>();
  for (const p of people) {
    lookup.set(p.name.trim().toLowerCase(), p.id);
    lookup.set(p.initials.trim().toLowerCase(), p.id);
  }

  let imported = 0;
  let skipped = 0;
  const unmatched: string[] = [];

  for (const row of parsed.data.rows) {
    const key = row.name.trim().toLowerCase();
    const personId = lookup.get(key);
    if (personId == null) {
      if (!unmatched.includes(row.name)) {
        unmatched.push(row.name);
      }
      skipped += 1;
      continue;
    }

    if (validateDateRange(row.startDate, row.endDate)) {
      skipped += 1;
      continue;
    }

    await db.insert(holidaysTable).values({
      personId,
      startDate: row.startDate,
      endDate: row.endDate,
      type: row.type ?? "annual",
      notes: row.notes ?? null,
    });
    imported += 1;
  }

  res.json(ImportHolidaysResponse.parse({ imported, skipped, unmatched }));
});

router.patch("/holidays/:id", async (req, res): Promise<void> => {
  const params = UpdateHolidayParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateHolidayBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.startDate != null || parsed.data.endDate != null) {
    const [existing] = await db
      .select()
      .from(holidaysTable)
      .where(eq(holidaysTable.id, params.data.id));
    if (!existing) {
      res.status(404).json({ error: "Holiday not found" });
      return;
    }
    const dateError = validateDateRange(
      parsed.data.startDate ?? existing.startDate,
      parsed.data.endDate ?? existing.endDate,
    );
    if (dateError) {
      res.status(400).json({ error: dateError });
      return;
    }
  }

  const [holiday] = await db
    .update(holidaysTable)
    .set(parsed.data)
    .where(eq(holidaysTable.id, params.data.id))
    .returning();

  if (!holiday) {
    res.status(404).json({ error: "Holiday not found" });
    return;
  }

  res.json(UpdateHolidayResponse.parse(holiday));
});

router.delete("/holidays/:id", async (req, res): Promise<void> => {
  const params = DeleteHolidayParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [holiday] = await db
    .delete(holidaysTable)
    .where(eq(holidaysTable.id, params.data.id))
    .returning();

  if (!holiday) {
    res.status(404).json({ error: "Holiday not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
