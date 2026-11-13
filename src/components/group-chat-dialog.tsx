"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2Icon } from "lucide-react";
import { Controller, useForm } from "react-hook-form";

import {
  createGroupChat,
  deleteGroupChat,
  updateGroupChat,
} from "@/actions/chat";
import { ChatAvatar } from "@/components/chat-avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { type Bot, groupChatInsertSchema, type Chat } from "@/db/schema";

type GroupChatBot = Pick<Bot, "id" | "name" | "avatar">;
type GroupChat = Pick<Chat, "id" | "name"> & { bots: Pick<Bot, "id">[] };

interface GroupChatDeleteButtonProps {
  chat: GroupChat;
  onDeleted: () => void;
}

const GroupChatDeleteButton = ({
  chat,
  onDeleted,
}: GroupChatDeleteButtonProps) => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const onDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteGroupChat(chat.id);
      toast.add({ type: "success", title: `${chat.name} deleted` });
      onDeleted();
      router.push("/");
    } catch {
      toast.add({
        type: "error",
        title: "Couldn't delete the group chat",
        description: "Something went wrong. Try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => !isDeleting && setOpen(open)}
    >
      <AlertDialogTrigger
        render={
          <Button type="button" variant="destructive" className="sm:mr-auto" />
        }
      >
        <Trash2Icon data-icon="inline-start" />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {chat.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the group chat and its messages. The bots in it stay.
            It can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={onDelete}
          >
            {isDeleting && <Spinner data-icon="inline-start" />}
            Delete group
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

interface GroupChatFormProps {
  chat?: GroupChat;
  bots: GroupChatBot[];
  onSaved: () => void;
}

function GroupChatForm({ chat, bots, onSaved }: GroupChatFormProps) {
  const router = useRouter();
  const form = useForm({
    resolver: zodResolver(groupChatInsertSchema),
    defaultValues: {
      name: chat?.name ?? "",
      botIds: chat?.bots.map((bot) => bot.id) ?? [],
    },
  });
  const { isSubmitting } = form.formState;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (chat) {
        await updateGroupChat(chat.id, values);
        toast.add({ type: "success", title: `${values.name} updated` });
        onSaved();
      } else {
        const created = await createGroupChat(values);
        toast.add({ type: "success", title: `${created.name} is ready` });
        onSaved();
        router.push(`/chats/${created.id}`);
      }
    } catch {
      toast.add({
        type: "error",
        title: chat
          ? "Couldn't update the group chat"
          : "Couldn't create the group chat",
        description: "Something went wrong. Try again.",
      });
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="group-chat-name">Name</FieldLabel>
              <Input
                {...field}
                id="group-chat-name"
                placeholder="Weekend plans"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="botIds"
          control={form.control}
          render={({ field, fieldState }) => (
            <FieldSet data-invalid={fieldState.invalid}>
              <FieldLegend variant="label">Bots</FieldLegend>
              {bots.length < 2 && (
                <FieldDescription>
                  A group needs at least two bots. Create more bots first.
                </FieldDescription>
              )}
              <FieldGroup data-slot="checkbox-group">
                {bots.map((bot) => (
                  <Field
                    key={bot.id}
                    orientation="horizontal"
                    data-invalid={fieldState.invalid}
                  >
                    <Checkbox
                      id={`group-chat-bot-${bot.id}`}
                      name={field.name}
                      aria-invalid={fieldState.invalid}
                      checked={field.value.includes(bot.id)}
                      onCheckedChange={(checked) =>
                        field.onChange(
                          checked
                            ? [...field.value, bot.id]
                            : field.value.filter((id) => id !== bot.id),
                        )
                      }
                    />
                    <FieldLabel
                      htmlFor={`group-chat-bot-${bot.id}`}
                      className="min-w-0 items-center font-normal"
                    >
                      <ChatAvatar seed={bot.avatar} className="size-6" />
                      <span className="truncate">{bot.name}</span>
                    </FieldLabel>
                  </Field>
                ))}
              </FieldGroup>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </FieldSet>
          )}
        />
      </FieldGroup>
      <DialogFooter>
        {chat && <GroupChatDeleteButton chat={chat} onDeleted={onSaved} />}
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner data-icon="inline-start" />}
          {chat ? "Save changes" : "Create group"}{" "}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface GroupChatDialogProps {
  chat?: GroupChat;
  bots: GroupChatBot[];
  trigger?: React.ReactElement;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const GroupChatDialog = ({
  chat,
  bots,
  trigger = <Button variant="secondary" />,
  children,
  open: controlledOpen,
  onOpenChange,
}: GroupChatDialogProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);

  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger render={trigger}>{children}</DialogTrigger>}

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {chat ? "Edit group chat" : "New group chat"}
          </DialogTitle>

          <DialogDescription>
            {chat
              ? "Change its name or which bots are in it."
              : "Name the group and pick which bots are in it."}
          </DialogDescription>
        </DialogHeader>

        <GroupChatForm chat={chat} bots={bots} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};
