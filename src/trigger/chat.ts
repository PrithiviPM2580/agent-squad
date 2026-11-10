import { chat } from "@trigger.dev/sdk/ai";
import { stepCountIs } from "ai";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { type Bot, chatMembers } from "@/db/schema";
import { openrouter } from "@/lib/open-router";
import { type ChatUIMessage, createSandboxTools } from "@/lib/sandbox-tools";

function buildInstructions(bot: Bot) {
  return [
    `You are ${bot.name}, an AI teammate. Your job: ${bot.job}`,
    "You work alongside the person you are talking to as a member of their team. They gave you your name and your job, and they come to you for that job. Stay in that role, and when asked who you are, answer as yourself.",
    bot.instructions &&
      `They also told you how to go about your job:\n\n${bot.instructions}`,
    "You have a sandbox of your own: an isolated Linux machine in the cloud with its own filesystem, network, CPU, memory and disk. It belongs to you alone, is not shared with other teammates, and stays yours for as long as you exist. Files you leave there are still there next time.",
    "Your tools all act on that sandbox. You can run shell commands and read, write and list files. It also has a graphical desktop, 1024x768 pixels, that you operate with the mouse and keyboard tools. Prefer the shell and file tools when they can do the job; use the desktop for things that need a screen.",
    "On the desktop you work blind until you look: call viewScreen to see it before you click or type, and again afterwards to check what happened. viewScreen is for your own eyes. Call showScreen instead only when the person asks to see the screen or asks what is on it, because that one puts the screenshot in the chat.",
    "Do the work rather than describing how it could be done, and say plainly when something failed.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

const clientDataSchema = z
  .object({
    botId: z.string().optional(),
  })
  .optional();

async function getChatBot(chatId: string, botId?: string) {
  const member = await db.query.chatMembers.findFirst({
    where: and(
      eq(chatMembers.chatId, chatId),
      botId ? eq(chatMembers.botId, botId) : undefined,
    ),
    orderBy: [asc(chatMembers.joinedAt), asc(chatMembers.botId)],
    with: {
      bot: true,
    },
  });

  if (!member) throw new Error(`No bot found for chatId: ${chatId}`);

  return member.bot;
}

export const chatAgent = chat
  .withUIMessage<ChatUIMessage>()
  .withClientData({ schema: clientDataSchema })
  .agent({
    id: "chat",
    tools: ({ chatId, clientData }) =>
      createSandboxTools(
        async () => (await getChatBot(chatId, clientData?.botId)).sandboxId,
      ),
    run: async ({
      chatId,
      clientData,
      messages,
      tools,
      signal,
      streamText,
    }) => {
      const bot = await getChatBot(chatId, clientData?.botId);

      return streamText({
        model: openrouter("nvidia/nemotron-3.5-super-vl:free"),
        instructions: buildInstructions(bot),
        messages,
        tools,
        stopWhen: stepCountIs(50),
        abortSignal: signal,
      });
    },
  });
