import { UserButton } from "@clerk/nextjs";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar";
import CreateMenu from "./create-menu";
import { getChats } from "@/queries/bots";
import { ChatAvatar } from "./chat-avatar";
import { formatDistanceToNowStrict } from "date-fns";
import { SearchCommand, SearchCommandItem } from "./search-command";
import Link from "next/link";

export const AppSidebar = async () => {
  const chats = await getChats();
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex-row justify-end">
          <CreateMenu />
        </div>
        <SearchCommand>
          {chats.map((chat) => (
            <SearchCommandItem
              key={chat.id}
              href={`/chats/${chat.id}`}
              value={chat.id}
              keywords={[chat.name ?? chat.bot.name]}
            >
              <ChatAvatar seed={chat.bot.avatar} />
              <span className="truncate">{chat.name ?? chat.bot.name}</span>
            </SearchCommandItem>
          ))}
        </SearchCommand>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    size="lg"
                    render={<Link href={`/chats/${chat.id}`} />}
                  >
                    <ChatAvatar seed={chat.bot.avatar} />
                    <div className="grid flex-1 text-left leading-tight">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate font-medium">
                          {chat.name ?? chat.bot.name}
                        </span>
                        <time
                          dateTime={chat.lastMessageAt.toISOString()}
                          className="ml-auto shrink-0 text-xs text-muted-foreground"
                        >
                          {formatDistanceToNowStrict(chat.lastMessageAt)}
                        </time>
                      </div>
                      {chat.lastMessagePreview && (
                        <span className="truncate text-xs text-muted-foreground">
                          {chat.lastMessagePreview}
                        </span>
                      )}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <UserButton
              showName
              appearance={{
                elements: {
                  rootBox: "flex! w-full!",
                  userButtonTrigger:
                    "flex! h-8! w-full! items-center! justify-start! gap-2! overflow-hidden! rounded-md! p-2! text-left! text-sm! text-sidebar-foreground! shadow-none! ring-sidebar-ring! outline-hidden! hover:bg-sidebar-accent! hover:text-sidebar-accent-foreground! focus-visible:ring-2! active:bg-sidebar-accent! active:text-sidebar-accent-foreground! aria-expanded:bg-sidebar-accent! aria-expanded:text-sidebar-accent-foreground!",
                  userButtonBox: "min-w-0! flex-1! gap-2!",
                  userButtonAvatarBox: "order-first! size-6! shrink-0!",
                  userButtonOuterIdentifier:
                    "truncate! ps-0! text-left! text-sm! font-normal! text-inherit!",
                },
              }}
            />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
};
