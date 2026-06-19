import { pgTable, serial, text } from "drizzle-orm/pg-core";

export const peopleTable = pgTable("people", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  initials: text("initials").notNull(),
  role: text("role").notNull().default("banker"),
  color: text("color").notNull().default("#64748b"),
});

export type Person = typeof peopleTable.$inferSelect;
export type InsertPerson = typeof peopleTable.$inferInsert;
