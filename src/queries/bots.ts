import { auth } from "@clerk/nextjs/server";
import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { bots, chatMembers, chats } from "@/db/schema";

export async function getChats() {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated) {
    throw new Error("User is not authenticated");
  }

  const rows = await db.query.chats.findMany({
    where: eq(chats.userId, userId),
    orderBy: desc(chats.lastMessageAt),
    with: {
      members: {
        orderBy: [asc(chatMembers.joinedAt), asc(chatMembers.botId)],
        with: {
          bot: true,
        },
      },
    },
  });

  return rows.flatMap(({ members, ...chat }) =>
    members.length > 0
      ? [{ ...chat, bots: members.map((mem) => mem.bot) }]
      : [],
  );
}

export async function getBots() {
  const { isAuthenticated, userId } = await auth();

  if (!isAuthenticated) {
    throw new Error("User is not authenticated");
  }

  return db.query.bots.findMany({
    where: eq(bots.userId, userId),
    orderBy: asc(bots.createdAt),
  });
}

export type ChatWithBots = Awaited<ReturnType<typeof getChats>>[number];
export type Bots = Awaited<ReturnType<typeof getBots>>;
