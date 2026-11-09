"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { SidebarMenuButton } from "./ui/sidebar";

interface ChatMenuButtonProps {
  chatId: string;
  tooltip: string;
  children: React.ReactNode;
}

export const ChatMenuButton = ({
  chatId,
  tooltip,
  children,
}: ChatMenuButtonProps) => {
  const params = useParams<{ chatId?: string }>();
  const isActive = params.chatId === chatId;

  return (
    <SidebarMenuButton
      size="lg"
      tooltip={tooltip}
      isActive={isActive}
      render={
        <Link
          href={`/chats/${chatId}`}
          aria-current={isActive ? "page" : undefined}
        />
      }
    >
      {children}
    </SidebarMenuButton>
  );
};
