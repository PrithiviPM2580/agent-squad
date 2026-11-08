"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { type BotInsert, botInsertSchema, bots } from "@/db/schema";

export async function createBot(values: BotInsert) {
  try {
    const { isAuthenticated, userId } = await auth();

    if (!isAuthenticated) {
      throw new Error("User is not authenticated");
    }

    const data = botInsertSchema.parse(values);

    const [bot] = await db
      .insert(bots)
      .values({ ...data, instructions: data.instructions || null, userId })
      .returning();

    revalidatePath("/");

    return bot;
  } catch (error) {
    console.error("Error creating bot:", error);
    throw new Error("Failed to create bot");
  }
}
