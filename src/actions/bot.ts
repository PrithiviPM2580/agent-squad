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
