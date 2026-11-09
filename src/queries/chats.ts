import { auth } from "@clerk/nextjs/server";
import { and, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { chatMembers, chats } from "@/db/schema";

export async function getChat(chatId: string) {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated) {
    throw new Error("User is not authenticated");
  }

  const row = await db.query.chats.findFirst({
    where: and(eq(chats.id, chatId), eq(chats.userId, userId)),
    with: {
      members: {
        orderBy: desc(chatMembers.joinedAt),
        limit: 1,
        with: {
          bot: true,
        },
      },
    },
  });

  if (!row) return null;

  const { members, ...chat } = row;
  return members[0] ? { ...chat, bot: members[0].bot } : null;
}
