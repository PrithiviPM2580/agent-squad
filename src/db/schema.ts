import { index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { nanoid } from "nanoid";
import type { z } from "zod";

export const bots = pgTable(
  "bots",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text().notNull(),
    name: text().notNull(),
    avatar: text()
      .notNull()
      .$defaultFn(() => nanoid()),
    job: text().notNull(),
    instructions: text(),
    sandboxId: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("bots_user_id_idx").on(table.userId)],
);

export const botInsertSchema = createInsertSchema(bots, {
  name: (schema) =>
    schema
      .trim()
      .min(1, "Name is required")
      .max(50, "Name must be less than 50 characters"),
  job: (schema) =>
    schema
      .trim()
      .min(1, "Job is required")
      .max(100, "Job must be less than 100 characters"),
  instructions: (schema) =>
    schema
      .trim()
      .min(1, "Instructions is required")
      .max(4000, "Instructions must be less than 4000 characters"),
}).omit({
  id: true,
  userId: true,
  sandboxId: true,
  createdAt: true,
});

export type Bot = typeof bots.$inferSelect;
export type NewBot = typeof bots.$inferInsert;
export type BotInsert = z.infer<typeof botInsertSchema>;
