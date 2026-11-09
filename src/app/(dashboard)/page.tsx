import { auth } from "@clerk/nextjs/server";
import { PlusIcon } from "lucide-react";
import { BotDialog } from "@/components/bot-dialog";
import { ChatAvatar } from "@/components/chat-avatar";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default async function Home() {
  await auth.protect();
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ChatAvatar seed={crypto.randomUUID()} className="size-10" />
        </EmptyMedia>
        <EmptyTitle>Meet your first bot</EmptyTitle>
        <EmptyDescription>
          Every bot gets its own personality, memory, and face. Spin one up and
          start the conversation.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <BotDialog
          trigger={
            <Button variant="secondary" size="lg">
              <PlusIcon />
              Create a new bot
            </Button>
          }
        />
      </EmptyContent>
    </Empty>
  );
}
