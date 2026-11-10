"use client";

import { PlusIcon, UsersIcon } from "lucide-react";
import { useState } from "react";
import type { Bot } from "@/db/schema";
import { BotDialog } from "./bot-dialog";
import { GroupChatDialog } from "./group-chat-dialog";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

type Bots = Pick<Bot, "id" | "name" | "avatar">[];

export const CreateMenu = ({ bots }: { bots: Bots }) => {
  const [botDialogOpen, setBotDialogOpen] = useState<boolean>(false);
  const [groupChatDialogOpen, setGroupChatDialogOpen] =
    useState<boolean>(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" aria-label="Create" />}
        >
          <PlusIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setBotDialogOpen(true)}>
            <PlusIcon />
            Create new Bot
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setGroupChatDialogOpen(true)}>
            <UsersIcon />
            Create group chat
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <BotDialog open={botDialogOpen} onOpenChange={setBotDialogOpen} />
      <GroupChatDialog
        bots={bots}
        open={groupChatDialogOpen}
        onOpenChange={setGroupChatDialogOpen}
      />
    </>
  );
};

export default CreateMenu;
