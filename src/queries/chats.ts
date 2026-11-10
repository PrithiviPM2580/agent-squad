import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";

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
        orderBy: [asc(chatMembers.joinedAt), asc(chatMembers.botId)],
        with: {
          bot: true,
        },
      },
    },
  });

  if (!row) return null;

  const { members, ...chat } = row;
  return members.length > 0
    ? { ...chat, bots: members.map((member) => member.bot) }
    : null;
}
