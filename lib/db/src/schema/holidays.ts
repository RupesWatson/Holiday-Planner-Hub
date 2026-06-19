import { pgTable, serial, integer, text, date } from "drizzle-orm/pg-core";
import { peopleTable } from "./people";

export const holidaysTable = pgTable("holidays", {
  id: serial("id").primaryKey(),
  personId: integer("person_id")
    .notNull()
    .references(() => peopleTable.id, { onDelete: "cascade" }),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  type: text("type").notNull().default("annual"),
  notes: text("notes"),
});

export type Holiday = typeof holidaysTable.$inferSelect;
export type InsertHoliday = typeof holidaysTable.$inferInsert;
