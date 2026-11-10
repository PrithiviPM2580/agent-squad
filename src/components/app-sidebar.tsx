import { UserButton } from "@clerk/nextjs";
import { formatDistanceToNowStrict } from "date-fns";
import { type ChatWithBots, getBots, getChats } from "@/queries/bots";
import { ChatAvatar } from "./chat-avatar";
import { ChatMenuButton } from "./chat-menu-button";
import CreateMenu from "./create-menu";
import { GroupChatAvatar } from "./group-chat-avatar";
import { SearchCommand, SearchCommandItem } from "./search-command";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarRail,
} from "./ui/sidebar";

const SidebarChatAvatar = ({ chat }: { chat: ChatWithBots }) => {
  return chat.kind === "group" ? (
    <GroupChatAvatar seeds={chat.bots.map((bot) => bot.avatar)} />
  ) : (
    <ChatAvatar seed={chat.bots[0].avatar} />
  );
};

export const AppSidebar = async () => {
  const [chats, bots] = await Promise.all([getChats(), getBots()]);
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex-row justify-end">
          <CreateMenu
            bots={bots.map(({ id, name, avatar }) => ({ id, name, avatar }))}
          />
        </div>
        <SearchCommand>
          {chats.map((chat) => (
            <SearchCommandItem
              key={chat.id}
              href={`/chats/${chat.id}`}
              value={chat.id}
              keywords={[chat.name ?? chat.bots[0].name]}
            >
              <SidebarChatAvatar chat={chat} />
              <span className="truncate">{chat.name ?? chat.bots[0].name}</span>
            </SearchCommandItem>
          ))}
        </SearchCommand>
      </SidebarHeader>
      <SidebarContent className="group-data-[collapsible=icon]:overflow-auto">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {chats.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <ChatMenuButton
                    chatId={chat.id}
                    tooltip={chat.name ?? chat.bots[0].name}
                  >
                    <SidebarChatAvatar chat={chat} />
                    <div className="grid flex-1 text-left leading-tight">
                      <div className="flex items-baseline gap-2">
                        <span className="truncate font-medium">
                          {chat.name ?? chat.bots[0].name}
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
                  </ChatMenuButton>
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
                    "flex! h-8! w-full! items-center! justify-start! gap-2! overflow-hidden! rounded-md! p-2! text-left! text-sm! text-sidebar-foreground! shadow-none! ring-sidebar-ring! outline-hidden! hover:bg-sidebar-accent! hover:text-sidebar-accent-foreground! focus-visible:ring-2! active:bg-sidebar-accent! active:text-sidebar-accent-foreground! aria-expanded:bg-sidebar-accent! aria-expanded:text-sidebar-accent-foreground! group-data-[collapsible=icon]:p-1!",
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
      <SidebarRail />
    </Sidebar>
  );
};
