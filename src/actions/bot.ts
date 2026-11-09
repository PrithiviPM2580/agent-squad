"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  type BotInsert,
  botInsertSchema,
  bots,
  chatMembers,
  chats,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";

export async function createBot(values: BotInsert) {
  try {
    const { isAuthenticated, userId } = await auth();

    if (!isAuthenticated) {
      throw new Error("User is not authenticated");
    }

    const data = botInsertSchema.parse(values);

    const bot = await db.transaction(async (tx) => {
      const [bot] = await tx
        .insert(bots)
        .values({ ...data, instructions: data.instructions || null, userId })
        .returning();

      const [chat] = await tx
        .insert(chats)
        .values({ userId, kind: "direct" })
        .returning({ id: chats.id });

      await tx.insert(chatMembers).values({ chatId: chat.id, botId: bot.id });

      return bot;
    });

    revalidatePath("/");

    return bot;
  } catch (error) {
    console.error("Error creating bot:", error);
    throw new Error("Failed to create bot");
  }
}

export async function updateBot(botId: string, values: BotInsert) {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated) {
    throw new Error("User is not authenticated");
  }

  const data = botInsertSchema.parse(values);

  const [bot] = await db
    .update(bots)
    .set({ ...data, instructions: data.instructions || null })
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
    .returning();

  if (!bot) {
    throw new Error(
      "Bot not found or user is not authorized to update this bot",
    );
  }

  revalidatePath("/", "layout");

  return bot;
}

export async function deleteBot(botId: string) {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated) {
    throw new Error("User is not authenticated");
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(chats)
      .where(
        and(
          eq(chats.userId, userId),
          eq(chats.kind, "direct"),
          inArray(
            chats.id,
            tx
              .select({ id: chatMembers.chatId })
              .from(chatMembers)
              .where(eq(chatMembers.botId, botId)),
          ),
        ),
      );

    const [bot] = await tx
      .delete(bots)
      .where(and(eq(bots.id, botId), eq(bots.userId, userId)))
      .returning({ id: bots.id });

    if (!bot) {
      throw new Error(
        "Bot not found or user is not authorized to delete this bot",
      );
    }
  });

  revalidatePath("/", "layout");
}
