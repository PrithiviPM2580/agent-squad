"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq, inArray } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  type BotInsert,
  botInsertSchema,
  bots,
  chatMembers,
  chats,
} from "@/db/schema";
import { createBotSandbox, deleteBotSandbox } from "@/lib/daytona";

export async function createBot(values: BotInsert) {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated) {
    throw new Error("User is not authenticated");
  }

  const data = botInsertSchema.parse(values);
  const botId = nanoid();
  const sandboxId = await createBotSandbox(botId);

  try {
    const bot = await db.transaction(async (tx) => {
      const [bot] = await tx
        .insert(bots)
        .values({
          ...data,
          id: botId,
          instructions: data.instructions || null,
          sandboxId,
          userId,
        })
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
    await deleteBotSandbox(sandboxId).catch(() => {});
    throw error;
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

  const [owned] = await db
    .select({ sandboxId: bots.sandboxId })
    .from(bots)
    .where(and(eq(bots.id, botId), eq(bots.userId, userId)));

  if (!owned)
    throw new Error(
      "Bot not found or user is not authorized to delete this bot",
    );

  await deleteBotSandbox(owned.sandboxId);

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
