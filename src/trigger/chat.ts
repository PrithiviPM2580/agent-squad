import { chat } from "@trigger.dev/sdk/ai";
import { stepCountIs } from "ai";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { type Bot, type Chat, chatMembers, chats } from "@/db/schema";
import { createHandoffTool, type Handoff } from "@/lib/handoff-tool";
import { openrouter } from "@/lib/open-router";
import { type ChatUIMessage, createSandboxTools } from "@/lib/sandbox-tools";
import { MEMORY_FILE } from "@/lib/daytona";

function buildGroupInstructions(bot: Bot, chat: Chat, bots: Bot[]) {
  const teammates = bots
    .filter((teammate) => teammate.id !== bot.id)
    .map(
      (teammate) => `- ${teammate.name} (id: ${teammate.id}): ${teammate.job}`,
    )
    .join("\n");

  return [
    `You are in a group chat${chat.name ? ` called "${chat.name}"` : ""}, together with the person and these other teammates. Each of them has a job and a sandbox of their own:\n\n${teammates}`,
    "The person addresses each message to one teammate, and this one is yours: either they picked you, or a teammate handed it to you. Earlier replies in this conversation may have been written by other teammates rather than by you. Use them as context, and do not present their work as your own.",
    "Besides your sandbox tools you have a handoff tool. Call it when a request clearly belongs to a teammate's job rather than yours, with their id and a short note on what is needed. That teammate then takes over and answers in your place, so write nothing more once you have called it. Do not hand off what you can do well yourself, or because a request is merely hard, and never pass a request back to a teammate who handed it to you. When nobody fits better, answer it yourself.",
  ];
}
const memoryInstructions = [
  "You talk to the person in more than one conversation: a private one-to-one chat, and any group chats they add you to. Each conversation only shows you its own messages, so nothing said in one is visible to you in another. Your memory is what carries across: notes you save with the remember tool and read back with the recall tool, the same notes in every conversation.",
  "Call recall before you answer anything that could depend on another conversation: a question about the person, their preferences, their projects, earlier decisions or earlier work, or a reference to something you cannot find in this conversation. Never say you do not know something about the person, and never ask them to tell you, until you have called recall in this turn. Skip it only for requests that plainly stand on their own.",
  `Call remember in the same turn you learn something that would be useful in a later conversation, and every time the person asks you to remember something. Telling them you will remember is not enough: unless you call remember, it is gone as soon as this conversation is. Leave out small talk and details that only matter to the request in front of you. The notes live in ${MEMORY_FILE} in your sandbox's home directory, which you can edit with the file tools when a note has gone out of date.`,
];

function buildInstructions(bot: Bot, group?: { chat: Chat; bots: Bot[] }) {
  return [
    `You are ${bot.name}, an AI teammate. Your job: ${bot.job}`,
    "You work alongside the person you are talking to as a member of their team. They gave you your name and your job, and they come to you for that job. Stay in that role, and when asked who you are, answer as yourself.",
    bot.instructions &&
      `They also told you how to go about your job:\n\n${bot.instructions}`,
    "You have a sandbox of your own: an isolated Linux machine in the cloud with its own filesystem, network, CPU, memory and disk. It belongs to you alone, is not shared with other teammates, and stays yours for as long as you exist. Files you leave there are still there next time.",
    "Your tools all act on that sandbox. You can run shell commands and read, write and list files. It also has a graphical desktop, 1024x768 pixels, that you operate with the mouse and keyboard tools. Prefer the shell and file tools when they can do the job; use the desktop for things that need a screen.",
    "On the desktop you work blind until you look: call viewScreen to see it before you click or type, and again afterwards to check what happened. viewScreen is for your own eyes. Call showScreen instead only when the person asks to see the screen or asks what is on it, because that one puts the screenshot in the chat.",
    ...memoryInstructions,
    ...(group ? buildGroupInstructions(bot, group.chat, group.bots) : []),
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

async function getChatBots(chatId: string, botId?: string) {
  const row = await db.query.chats.findFirst({
    where: eq(chats.id, chatId),
    with: {
      members: {
        orderBy: [asc(chatMembers.joinedAt), asc(chatMembers.botId)],
        with: {
          bot: true,
        },
      },
    },
  });

  const bots = row?.members.map((m) => m.bot) ?? [];
  const bot = botId ? bots.find((b) => b.id === botId) : bots[0];
  if (!row || !bot)
    throw new Error(
      `Chat or bot not found for chatId=${chatId} botId=${botId}`,
    );
  return { chat: row, bots, bot };
}

export const chatAgent = chat
  .withUIMessage<ChatUIMessage>()
  .withClientData({ schema: clientDataSchema })
  .agent({
    id: "chat",
    tools: async ({ chatId, clientData }) => {
      const {
        chat: { kind },
        bots,
        bot,
      } = await getChatBots(chatId, clientData?.botId);

      // Whoever holds the turn; a handoff moves it, and the sandbox tools with it
      let current = bot;
      const held = new Set([bot.id]);
      const sandboxTools = createSandboxTools(() => current.sandboxId);

      if (kind !== "group") return sandboxTools;

      return {
        ...sandboxTools,
        ...createHandoffTool((botId) => {
          const target = bots.find((bot) => bot.id === botId);
          if (!target) throw new Error("No teammate in this chat has that id.");
          // Keeps a request from bouncing between bots
          if (held.has(target.id)) {
            throw new Error(
              `${target.name} already had this request. Answer it yourself.`,
            );
          }

          current = target;
          held.add(target.id);
          return { botId: target.id, name: target.name };
        }),
      };
    },

    run: async ({
      chatId,
      clientData,
      messages,
      tools,
      signal,
      streamText,
    }) => {
      const {
        chat: row,
        bots,
        bot,
      } = await getChatBots(chatId, clientData?.botId);
      const group = row.kind === "group" ? { chat: row, bots } : undefined;

      chat.setUIMessageStreamOptions({
        messageMetadata: () => ({ botId: bot.id }),
      });

      return streamText({
        model: openrouter("nvidia/nemotron-3.5-super-vl:free"),
        instructions: buildInstructions(bot, group),
        messages,
        tools,
        prepareStep: ({ steps }) => {
          const handoff = steps
            .flatMap((step) => step.toolResults)
            .findLast((result) => result.toolName === "handoff");
          const current =
            handoff &&
            bots.find((bot) => bot.id === (handoff.output as Handoff).botId);

          return current
            ? { instructions: buildInstructions(current, group) }
            : undefined;
        },
        stopWhen: stepCountIs(50),
        abortSignal: signal,
      });
    },
  });
