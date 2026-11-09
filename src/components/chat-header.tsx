import { MonitorIcon } from "lucide-react";
import type { ChatWithBot } from "@/queries/bots";
import { BotDialog } from "./bot-dialog";
import { ChatAvatar } from "./chat-avatar";
import { Button } from "./ui/button";

export const ChatHeader = ({ chat }: { chat: ChatWithBot }) => {
  return (
    <header
      data-slot="chat-header"
      className="flex h-12 shrink-0 items-center gap-2 border-b px-4"
    >
      <h1 className="-ml-2 flex min-w-0">
        <BotDialog
          bot={chat.bot}
          trigger={
            <Button variant="ghost" className="min-w-0 shrink gap-2 px-2">
              <ChatAvatar seed={chat.bot.avatar} className="size-6" />
              <span className="truncate">{chat?.name ?? chat.bot.name}</span>
            </Button>
          }
        />
      </h1>
      <Button
        variant="ghost"
        size="icon-sm"
        className="ml-auto"
        aria-label="Desktop"
      >
        <MonitorIcon />
      </Button>
    </header>
  );
};
