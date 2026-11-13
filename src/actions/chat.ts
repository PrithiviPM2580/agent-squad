"use server";

import { auth as clerkAuth } from "@clerk/nextjs/server";
import { auth } from "@trigger.dev/sdk";
import {
  type ChatStartSessionParams,
  chat,
  defaultStorage,
} from "@trigger.dev/sdk/ai";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  bots,
  chatMembers,
  chats,
  type GroupChatInsert,
  groupChatInsertSchema,
} from "@/db/schema";
import { getBotDesktopUrl } from "@/lib/daytona";
import type { ChatUIMessage } from "@/lib/sandbox-tools";
import { getChat } from "@/queries/chats";
import type { chatAgent } from "@/trigger/chat";

const startSession = chat.createStartSessionAction<typeof chatAgent>("chat");
const loadStoredTranscript = chat.createLoadTranscriptAction(defaultStorage);

async function assertChatOwner(chatId: string) {
  const chat = await getChat(chatId);

  if (!chat) throw new Error("Chat not found");
}

export async function startChatSession(
  params: ChatStartSessionParams<typeof chatAgent>,
) {
  await assertChatOwner(params.chatId);

  return startSession(params);
}

export async function mintChatAccessToken(chatId: string) {
  await assertChatOwner(chatId);

  return auth.createPublicToken({
    scopes: { read: { sessions: chatId }, write: { sessions: chatId } },
    expirationTime: "1h",
  });
}

export async function loadTranscript(params: { chatId: string }) {
  await assertChatOwner(params.chatId);

  const transcript = await loadStoredTranscript(params);

  return {
    ...transcript,
    messages: transcript.messages as ChatUIMessage[],
  };
}

export async function getDesktopUrl(chatId: string) {
  const chat = await getChat(chatId);

  if (!chat || chat.kind !== "direct") throw new Error("Chat not found");

  return getBotDesktopUrl(chat.bots[0].sandboxId);
}

export async function createGroupChat(values: GroupChatInsert) {
  const { isAuthenticated, userId } = await clerkAuth();

  if (!isAuthenticated) throw new Error("User is not authenticated");

  const data = groupChatInsertSchema.parse(values);
  const botIds = [...new Set(data.botIds)];

  const owned = await db
    .select({ id: bots.id })
    .from(bots)
    .where(and(eq(bots.userId, userId), inArray(bots.id, botIds)));

  if (botIds.length < 2 || owned.length !== botIds.length) {
    throw new Error("Bot not found or not owned by user");
  }

  const chat = await db.transaction(async (tx) => {
    const [chat] = await tx
      .insert(chats)
      .values({
        userId,
        kind: "group",
        name: data.name,
      })
      .returning();

    await tx
      .insert(chatMembers)
      .values(botIds.map((botId) => ({ chatId: chat.id, botId })));

    return chat;
  });

  revalidatePath("/", "layout");

  return chat;
}

export async function updateGroupChat(chatId: string, values: GroupChatInsert) {
  const { isAuthenticated, userId } = await clerkAuth();

  if (!isAuthenticated) throw new Error("User is not authenticated");

  const data = groupChatInsertSchema.parse(values);
  const botIds = [...new Set(data.botIds)];

  const owned = await db
    .select({ id: bots.id })
    .from(bots)
    .where(and(eq(bots.userId, userId), inArray(bots.id, botIds)));

  if (botIds.length < 2 || owned.length !== botIds.length) {
    throw new Error("Bot not found or not owned by user");
  }

  const chat = await db.transaction(async (tx) => {
    const [chat] = await tx
      .update(chats)
      .set({
        name: data.name,
      })
      .where(
        and(
          eq(chats.id, chatId),
          eq(chats.userId, userId),
          eq(chats.kind, "group"),
        ),
      )
      .returning();

    if (!chat) throw new Error("Chat not found or not owned by user");

    await tx
      .delete(chatMembers)
      .where(
        and(
          eq(chatMembers.chatId, chatId),
          notInArray(chatMembers.botId, botIds),
        ),
      );

    await tx
      .insert(chatMembers)
      .values(botIds.map((botId) => ({ chatId, botId })))
      .onConflictDoNothing();

    return chat;
  });

  revalidatePath("/", "layout");

  return chat;
}

export async function deleteGroupChat(chatId: string) {
  const { isAuthenticated, userId } = await clerkAuth();

  if (!isAuthenticated) throw new Error("User is not authenticated");

  const deleted = await db
    .delete(chats)
    .where(
      and(
        eq(chats.id, chatId),
        eq(chats.userId, userId),
        eq(chats.kind, "group"),
      ),
    )
    .returning({ id: chats.id });

  if (deleted.length === 0)
    throw new Error("Chat not found or not owned by user");

  revalidatePath("/", "layout");
}
