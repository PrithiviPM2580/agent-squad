import { relations } from "drizzle-orm";
import {
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { nanoid } from "nanoid";
import { z } from "zod";

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
    sandboxId: text().notNull(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("bots_user_id_idx").on(table.userId)],
);

export const chatKind = pgEnum("chat_kind", ["direct", "group"]);

export const chats = pgTable(
  "chats",
  {
    id: text()
      .primaryKey()
      .$defaultFn(() => nanoid()),
    userId: text().notNull(),
    kind: chatKind().notNull().default("direct"),
    name: text(),
    lastMessagePreview: text(),
    lastMessageAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("chats_user_id_idx").on(table.userId)],
);

export const chatMembers = pgTable(
  "chat_members",
  {
    chatId: text()
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    botId: text()
      .notNull()
      .references(() => bots.id, { onDelete: "cascade" }),
    joinedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.chatId, table.botId] }),
    index("chat_members_bot_id_idx").on(table.botId),
  ],
);

export const botsRelations = relations(bots, ({ many }) => ({
  memberships: many(chatMembers),
}));

export const chatsRelations = relations(chats, ({ many }) => ({
  members: many(chatMembers),
}));

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, {
    fields: [chatMembers.chatId],
    references: [chats.id],
  }),
  bot: one(bots, {
    fields: [chatMembers.botId],
    references: [bots.id],
  }),
}));

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

export const groupChatInsertSchema = createInsertSchema(chats, {
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(50, "Name must be less than 50 characters"),
})
  .omit({
    id: true,
    userId: true,
    kind: true,
    lastMessagePreview: true,
    lastMessageAt: true,
    createdAt: true,
  })
  .extend({
    botIds: z.array(z.string()).min(2, "At least 2 bots are required"),
  });

export type Bot = typeof bots.$inferSelect;
export type NewBot = typeof bots.$inferInsert;
export type BotInsert = z.infer<typeof botInsertSchema>;
export type GroupChatInsert = z.infer<typeof groupChatInsertSchema>;

export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type ChatMember = typeof chatMembers.$inferSelect;
export type NewChatMember = typeof chatMembers.$inferInsert;
