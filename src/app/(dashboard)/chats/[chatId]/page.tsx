import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { ChatHeader } from "@/components/chat-header";
import { getChat } from "@/queries/chats";

interface PageProps {
  params: Promise<{ chatId: string }>;
}

export default async function Page({ params }: PageProps) {
  await auth.protect();

  const { chatId } = await params;
  const chat = await getChat(chatId);

  if (!chat) notFound();

  return (
    <div className="flex h-svh flex-col">
      <ChatHeader chat={chat} />
    </div>
  );
}
