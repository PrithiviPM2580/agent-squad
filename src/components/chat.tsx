"use client";

import { useChat } from "@ai-sdk/react";
import type { TriggerChatTransport } from "@trigger.dev/sdk/chat";
import {
  useLoadTranscript,
  useTriggerChatTransport,
} from "@trigger.dev/sdk/chat/react";
import type { UIMessage } from "ai";
import {
  loadTranscript,
  mintChatAccessToken,
  startChatSession,
} from "@/actions/chat";
import type { chatAgent } from "@/trigger/chat";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "./ai-elements/conversation";
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
  initialMessages: UIMessage[];
  transport: TriggerChatTransport;
}

export const ChatMessages = ({
  chatId,
  initialMessages,
  transport,
}: ChatMessagesProps) => {
  const { messages, sendMessage, status, stop } = useChat({
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
                {message.parts.map((part, i) =>
                  part.type === "text" ? (
                    <MessageResponse key={`${message.id}-${i}`}>
                      {part.text}
                    </MessageResponse>
                  ) : null,
                )}
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
