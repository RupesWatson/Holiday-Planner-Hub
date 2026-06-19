import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, peopleTable } from "@workspace/db";
import {
  CreatePersonBody,
  UpdatePersonParams,
  UpdatePersonBody,
  DeletePersonParams,
  ListPeopleResponse,
  UpdatePersonResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const PALETTE = [
  "#2563eb",
  "#0891b2",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#ca8a04",
  "#dc2626",
  "#0d9488",
  "#9333ea",
  "#c026d3",
  "#65a30d",
  "#0284c7",
  "#e11d48",
  "#4f46e5",
  "#d97706",
];

router.get("/people", async (_req, res): Promise<void> => {
  const people = await db.select().from(peopleTable).orderBy(peopleTable.id);
  res.json(ListPeopleResponse.parse(people));
});

router.post("/people", async (req, res): Promise<void> => {
  const parsed = CreatePersonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const existing = await db.select().from(peopleTable);
  const color =
    parsed.data.color ?? PALETTE[existing.length % PALETTE.length];

  const [person] = await db
    .insert(peopleTable)
    .values({
      name: parsed.data.name,
      initials: parsed.data.initials,
      role: parsed.data.role,
      color,
    })
    .returning();

  res.status(201).json(UpdatePersonResponse.parse(person));
});

router.patch("/people/:id", async (req, res): Promise<void> => {
  const params = UpdatePersonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdatePersonBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [person] = await db
    .update(peopleTable)
    .set(parsed.data)
    .where(eq(peopleTable.id, params.data.id))
    .returning();

  if (!person) {
    res.status(404).json({ error: "Person not found" });
    return;
  }

  res.json(UpdatePersonResponse.parse(person));
});

router.delete("/people/:id", async (req, res): Promise<void> => {
  const params = DeletePersonParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [person] = await db
    .delete(peopleTable)
    .where(eq(peopleTable.id, params.data.id))
    .returning();

  if (!person) {
    res.status(404).json({ error: "Person not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
