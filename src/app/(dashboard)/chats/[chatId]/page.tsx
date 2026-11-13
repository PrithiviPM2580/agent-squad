import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { Chat } from "@/components/chat";
import { ChatHeader } from "@/components/chat-header";
import { DesktopPanel, DesktopPanelProvider } from "@/components/desktop-panel";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { getChat } from "@/queries/chats";
import { getBots } from "@/queries/bots";

interface PageProps {
  params: Promise<{ chatId: string }>;
}

export default async function Page({ params }: PageProps) {
  await auth.protect();

  const { chatId } = await params;
  const chat = await getChat(chatId);

  if (!chat) notFound();

  if (chat.kind === "group") {
    const bots = await getBots();
    return (
      <div className="flex h-svh flex-col">
        <ChatHeader
          chat={chat}
          bots={bots.map(({ id, name, avatar }) => ({ id, name, avatar }))}
        />
        <Chat
          chatId={chat.id}
          bots={chat.bots.map(({ id, name, avatar }) => ({ id, name, avatar }))}
        />
      </div>
    );
  }

  return (
    <DesktopPanelProvider key={chat.id} chatId={chat.id}>
      <div className="h-svh">
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel id="chat" minSize="30%">
            <div className="flex h-full flex-col">
              <ChatHeader chat={chat} />
              <Chat
                chatId={chat.id}
                bots={chat.bots.map(({ id, name, avatar }) => ({
                  id,
                  name,
                  avatar,
                }))}
              />
            </div>
          </ResizablePanel>
          <DesktopPanel name={chat.bots[0].name} />
        </ResizablePanelGroup>
      </div>
    </DesktopPanelProvider>
  );
}
