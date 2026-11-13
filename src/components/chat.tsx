"use client";

import { useChat } from "@ai-sdk/react";
import type { TriggerChatTransport } from "@trigger.dev/sdk/chat";
import {
  useLoadTranscript,
  useTriggerChatTransport,
} from "@trigger.dev/sdk/chat/react";
import { isToolUIPart } from "ai";
import { useState } from "react";
import {
  loadTranscript,
  mintChatAccessToken,
  startChatSession,
} from "@/actions/chat";
import { CodeBlock } from "@/components/ai-elements/code-block";
import { Badge } from "./ui/badge";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import type { Bot } from "@/db/schema";
import type { ChatUIMessage } from "@/lib/sandbox-tools";
import type { chatAgent } from "@/trigger/chat";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "./ai-elements/conversation";
import { Image } from "./ai-elements/image";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "./ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSelect,
  PromptInputSelectContent,
  PromptInputSelectItem,
  PromptInputSelectTrigger,
  PromptInputSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "./ai-elements/prompt-input";
import { ChatAvatar } from "./chat-avatar";
import { usePaywall } from "@/hooks/use-paywall";

type ChatBot = Pick<Bot, "id" | "name" | "avatar">;

type ToolPart = Extract<
  ChatUIMessage["parts"][number],
  { type: `tool-${string}` }
>;

const toolTitles: Record<ToolPart["type"], string> = {
  "tool-bash": "Run command",
  "tool-readFile": "Read file",
  "tool-writeFile": "Write file",
  "tool-listFiles": "List files",
  "tool-recall": "Recall",
  "tool-remember": "Remember",
  "tool-mouseClick": "Click",
  "tool-mouseMove": "Move mouse",
  "tool-mouseDrag": "Drag",
  "tool-mouseScroll": "Scroll",
  "tool-keyboardType": "Type",
  "tool-keyboardPress": "Press key",
  "tool-viewScreen": "Look at screen",
  "tool-showScreen": "Show screen",
  "tool-handoff": "Handoff",
};

const ToolCall = ({ part }: { part: ToolPart }) => {
  if (part.type === "tool-showScreen" && part.state === "output-available") {
    return (
      <Image
        alt="The Sandbox's Screen"
        base64={part.output.base64}
        className="border"
        mediaType={part.output.mediaType}
      />
    );
  }

  if (part.type === "tool-handoff" && part.state === "output-available") {
    return (
      <p className="text-muted-foreground">Handed off to {part.output.name}</p>
    );
  }

  return (
    <Tool>
      <ToolHeader
        state={part.state}
        title={toolTitles[part.type]}
        type={part.type}
      />
      <ToolContent>
        <ToolCallDetails part={part} />
      </ToolContent>
    </Tool>
  );
};
const splitByAuthor = (message: ChatUIMessage, bots: ChatBot[]) => {
  const findBot = (botId?: string) => bots.find((bot) => bot.id === botId);

  let section = {
    author:
      message.role === "assistant"
        ? findBot(message.metadata?.botId)
        : undefined,
    parts: [] as ChatUIMessage["parts"],
  };
  const sections = [section];

  for (const part of message.parts) {
    section.parts.push(part);

    if (part.type === "tool-handoff" && part.state === "output-available") {
      section = { author: findBot(part.output.botId), parts: [] };
      sections.push(section);
    }
  }

  return sections;
};

const ToolCallDetails = ({ part }: { part: ToolPart }) => {
  const err = part.state === "output-error" ? part.errorText : undefined;

  if (part.type === "tool-viewScreen" || part.type === "tool-showScreen") {
    return (
      <ToolOutput
        errorText={err}
        output={
          part.state === "output-available" ? (
            <p className="p-3 text-muted-foreground">
              {part.type === "tool-viewScreen"
                ? "Took a screenshot for its own use"
                : "Took a screenshot"}
            </p>
          ) : undefined
        }
      />
    );
  }

  if (part.type === "tool-bash") {
    return (
      <>
        {part.input?.command ? (
          <CodeBlock code={part.input.command} language="bash" />
        ) : null}
        <ToolOutput
          errorText={err}
          output={
            part.state === "output-available" ? (
              <CodeBlock
                code={part.output.output || `Exit code ${part.output.exitCode}`}
                language="log"
              />
            ) : undefined
          }
        />
      </>
    );
  }

  return (
    <>
      {part.input === undefined ? null : <ToolInput input={part.input} />}
      <ToolOutput
        errorText={err}
        output={part.state === "output-available" ? part.output : undefined}
      />
    </>
  );
};

interface ChatProps {
  chatId: string;
  bots?: ChatBot[];
}

export const Chat = ({ chatId, bots }: ChatProps) => {
  const transport = useTriggerChatTransport<typeof chatAgent>({
    task: "chat",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) =>
      startChatSession({ chatId, clientData }),
  });

  const { messages, isLoading } = useLoadTranscript(chatId, loadTranscript, {
    transport,
  });

  if (isLoading) return null;

  return (
    <ChatMessages
      key={chatId}
      chatId={chatId}
      bots={bots}
      initialMessages={messages}
      transport={transport}
    />
  );
};

interface ChatMessagesProps {
  chatId: string;
  bots?: ChatBot[];
  initialMessages: ChatUIMessage[];
  transport: TriggerChatTransport;
}

export const ChatMessages = ({
  chatId,
  bots = [],
  initialMessages,
  transport,
}: ChatMessagesProps) => {
  const { messages, sendMessage, status, stop, error } = useChat<ChatUIMessage>(
    {
      id: chatId,
      messages: initialMessages,
      transport,
    },
  );

  const [botId, setBotId] = useState<string>(bots[0]?.id ?? "");
  const selectedBot = bots.find((bot) => bot.id === botId) ?? bots[0];
  const checkPaywall = usePaywall();

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return;

    if (!checkPaywall("bots")) throw new Error("Upgrade required");
    const metadata = selectedBot && { botId: selectedBot.id };

    sendMessage({ text: message.text, metadata }, { metadata });
  };

  return (
    <div data-slot="chat" className="flex min-h-0 flex-1 flex-col">
      <Conversation>
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.flatMap((message) => {
            const addressee =
              message.role === "user"
                ? bots.find((bot) => bot.id === message.metadata?.botId)
                : undefined;

            return splitByAuthor(message, bots).map(({ author, parts }, i) => {
              const renderedParts = parts.map((part, j) => {
                if (part.type === "text") {
                  return (
                    <MessageResponse
                      key={`${message.id}-${i}-${j}`}
                      className={
                        addressee && j === 0
                          ? "inline [&>p:first-child]:inline"
                          : undefined
                      }
                    >
                      {part.text}
                    </MessageResponse>
                  );
                }
                if (part.type !== "dynamic-tool" && isToolUIPart(part)) {
                  return <ToolCall key={part.toolCallId} part={part} />;
                }
                return null;
              });

              return (
                <Message
                  from={message.role}
                  key={`${message.id}-${i}`}
                  className={author && "flex-row items-start"}
                >
                  {author && (
                    <ChatAvatar seed={author.avatar} className="size-6" />
                  )}
                  <MessageContent>
                    {addressee ? (
                      <div>
                        <Badge
                          variant="outline"
                          className="mr-1.5 max-w-40 pl-1 align-top"
                        >
                          <ChatAvatar
                            seed={addressee.avatar}
                            className="size-3.5"
                          />
                          <span className="truncate">{addressee.name}</span>
                        </Badge>
                        {renderedParts}
                      </div>
                    ) : (
                      renderedParts
                    )}
                  </MessageContent>
                </Message>
              );
            });
          })}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      {error ? (
        <p
          className="mx-auto w-full max-w-3xl px-4 pb-2 text-sm text-destructive"
          role="alert"
        >
          Unable to send message: {error.message}
        </p>
      ) : null}
      <div className="mx-auto w-full max-w-3xl p-4 pt-0">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea placeholder="Send a message..." />
          <PromptInputFooter
            className={selectedBot ? undefined : "justify-end"}
          >
            {selectedBot && (
              <PromptInputTools>
                <PromptInputSelect
                  value={selectedBot.id}
                  onValueChange={(value) => setBotId(value as string)}
                >
                  <PromptInputSelectTrigger aria-label="Bot to talk to">
                    <PromptInputSelectValue>
                      <ChatAvatar
                        seed={selectedBot.avatar}
                        className="size-5"
                      />
                      {selectedBot.name}
                    </PromptInputSelectValue>
                  </PromptInputSelectTrigger>
                  <PromptInputSelectContent>
                    {bots.map((bot) => (
                      <PromptInputSelectItem key={bot.id} value={bot.id}>
                        <ChatAvatar seed={bot.avatar} className="size-5" />
                        {bot.name}
                      </PromptInputSelectItem>
                    ))}
                  </PromptInputSelectContent>
                </PromptInputSelect>
              </PromptInputTools>
            )}
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};
