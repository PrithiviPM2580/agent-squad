"use client";

import { MonitorIcon } from "lucide-react";
import type { ChatWithBots } from "@/queries/bots";
import { BotDialog } from "./bot-dialog";
import { ChatAvatar } from "./chat-avatar";
import { GroupChatDialog } from "./group-chat-dialog";
import { useDesktopPanelContext } from "./desktop-panel";
import { GroupChatAvatar } from "./group-chat-avatar";
import { Button } from "./ui/button";
import type { Bot } from "@/db/schema";

const DesktopButton = () => {
  const desktopPanel = useDesktopPanelContext();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="ml-auto"
      aria-label="Desktop"
      aria-pressed={desktopPanel.open}
      onClick={desktopPanel.toggle}
    >
      <MonitorIcon />
    </Button>
  );
};

interface ChatHeaderProps {
  chat: ChatWithBots;
  bots?: Pick<Bot, "id" | "name" | "avatar">[];
}

export const ChatHeader = ({ chat, bots = [] }: ChatHeaderProps) => {
  return (
    <header
      data-slot="chat-header"
      className="flex h-12 shrink-0 items-center gap-2 border-b px-4"
    >
      {chat.kind === "group" ? (
        <h1 className="-ml-2 flex min-w-0">
          <GroupChatDialog
            chat={chat}
            bots={bots}
            trigger={
              <Button variant="ghost" className="min-w-0 shrink gap-2 px-2" />
            }
          >
            <GroupChatAvatar
              seeds={chat.bots.map((bot) => bot.avatar)}
              className="size-6"
            />
            <span className="truncate">{chat.name}</span>
          </GroupChatDialog>
        </h1>
      ) : (
        <>
          <h1 className="-ml-2 flex min-w-0">
            <BotDialog
              bot={chat.bots[0]}
              trigger={
                <Button variant="ghost" className="min-w-0 shrink gap-2 px-2">
                  <ChatAvatar seed={chat.bots[0].avatar} className="size-6" />
                  <span className="truncate">
                    {chat.name ?? chat.bots[0].name}
                  </span>
                </Button>
              }
            />
          </h1>
          <DesktopButton />
        </>
      )}
    </header>
  );
};
