"use client";

import { useChat } from "@ai-sdk/react";
import type { TriggerChatTransport } from "@trigger.dev/sdk/chat";
import {
  useLoadTranscript,
  useTriggerChatTransport,
} from "@trigger.dev/sdk/chat/react";
import { isToolUIPart } from "ai";
import {
  loadTranscript,
  mintChatAccessToken,
  startChatSession,
} from "@/actions/chat";
import { CodeBlock } from "@/components/ai-elements/code-block";
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
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
  PromptInputSubmit,
  PromptInputTextarea,
} from "./ai-elements/prompt-input";

type ToolPart = Extract<
  ChatUIMessage["parts"][number],
  { type: `tool-${string}` }
>;

const toolTitles: Record<ToolPart["type"], string> = {
  "tool-bash": "Run command",
  "tool-readFile": "Read file",
  "tool-writeFile": "Write file",
  "tool-listFiles": "List files",
  "tool-mouseClick": "Click",
  "tool-mouseMove": "Move mouse",
  "tool-mouseDrag": "Drag",
  "tool-mouseScroll": "Scroll",
  "tool-keyboardType": "Type",
  "tool-keyboardPress": "Press key",
  "tool-viewScreen": "Look at screen",
  "tool-showScreen": "Show screen",
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
}

export const Chat = ({ chatId }: ChatProps) => {
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
      initialMessages={messages}
      transport={transport}
    />
  );
};

interface ChatMessagesProps {
  chatId: string;
  initialMessages: ChatUIMessage[];
  transport: TriggerChatTransport;
}

export const ChatMessages = ({
  chatId,
  initialMessages,
  transport,
}: ChatMessagesProps) => {
  const { messages, sendMessage, status, stop } = useChat<ChatUIMessage>({
    id: chatId,
    messages: initialMessages,
    transport,
  });

  const handleSubmit = (message: PromptInputMessage) => {
    if (!message.text.trim()) return;
    sendMessage(message);
  };

  return (
    <div data-slot="chat" className="flex min-h-0 flex-1 flex-col">
      <Conversation>
        <ConversationContent className="mx-auto w-full max-w-3xl">
          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent>
                {message.parts.map((part, i) => {
                  if (part.type === "text") {
                    return (
                      <MessageResponse key={`${message.id}-${i}`}>
                        {part.text}
                      </MessageResponse>
                    );
                  }
                  if (part.type !== "dynamic-tool" && isToolUIPart(part)) {
                    return <ToolCall key={part.toolCallId} part={part} />;
                  }
                  return null;
                })}
              </MessageContent>
            </Message>
          ))}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>
      <div className="mx-auto w-full max-w-3xl p-4 pt-0">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputTextarea placeholder="Send a message..." />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit status={status} onStop={stop} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
};
