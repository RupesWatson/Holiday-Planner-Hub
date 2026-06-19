import { pgTable, serial, integer, text } from "drizzle-orm/pg-core";

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  maxAway: integer("max_away").notNull().default(3),
  teamName: text("team_name").notNull().default("FIG Team"),
});

export type Settings = typeof settingsTable.$inferSelect;
export type InsertSettings = typeof settingsTable.$inferInsert;
