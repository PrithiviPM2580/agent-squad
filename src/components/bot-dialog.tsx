"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShuffleIcon, Trash2Icon } from "lucide-react";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { createBot, deleteBot, updateBot } from "@/actions/bot";
import { usePaywall } from "@/hooks/use-paywall";
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
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { type Bot, type BotInsert, botInsertSchema } from "@/db/schema";
import { PRESENTS } from "@/lib/constant";
import { ChatAvatar } from "./chat-avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Spinner } from "./ui/spinner";
import { toast } from "./ui/toast";

interface BotFormProps {
  bot?: Bot;
  onSaved: () => void;
}

export const BotForm = ({ bot, onSaved }: BotFormProps) => {
  const [initialSeed] = useState(() => bot?.avatar ?? nanoid());
  const form = useForm<BotInsert>({
    resolver: zodResolver(botInsertSchema),
    defaultValues: {
      name: bot?.name ?? "",
      avatar: initialSeed,
      job: bot?.job ?? "",
      instructions: bot?.instructions ?? "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: BotInsert) => {
    try {
      if (bot) {
        const updated = await updateBot(bot.id, values);
        toast.add({ type: "success", title: `${updated.name} updated` });
      } else {
        const created = await createBot(values);
        toast.add({ type: "success", title: `${created.name} created` });
      }
      onSaved();
    } catch {
      toast.add({
        type: "error",
        title: bot ? "Failed to update bot" : "Failed to create bot",
        description: "Something went wrong while creating the bot.",
      });
    }
  };

  return (
    <form
      id="form-rhf-demo"
      onSubmit={form.handleSubmit(onSubmit)}
      className="flex flex-col gap-4"
    >
      <div className="flex flex-wrap gap-2">
        {PRESENTS.map((present) => (
          <Button
            key={present.job}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              form.setValue("job", present.job, {
                shouldDirty: true,
                shouldValidate: true,
              });
              form.setValue("instructions", present.instructions, {
                shouldDirty: true,
                shouldValidate: true,
              });
            }}
          >
            {present.job}
          </Button>
        ))}
      </div>
      <FieldGroup>
        <Controller
          name="avatar"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field orientation="horizontal" data-invalid={fieldState.invalid}>
              <ChatAvatar
                seed={field.value ?? initialSeed}
                className="size-10"
              />
              <FieldContent>
                <FieldTitle>Face</FieldTitle>
                <FieldDescription>
                  Shuffle until you find one you like.
                </FieldDescription>
              </FieldContent>
              <Button
                type="button"
                variant="outline"
                onClick={() => field.onChange(nanoid())}
              >
                <ShuffleIcon />
                Shuffle
              </Button>
            </Field>
          )}
        />
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="form-rhf-demo-name">Name</FieldLabel>
              <Input
                {...field}
                id="form-rhf-demo-name"
                aria-invalid={fieldState.invalid}
                placeholder="e.g. John Doe"
                autoComplete="off"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="job"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="form-rhf-demo-job">Job</FieldLabel>
              <Input
                {...field}
                id="form-rhf-demo-job"
                aria-invalid={fieldState.invalid}
                placeholder="Research assistant"
                autoComplete="off"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="instructions"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="form-rhf-demo-instructions">
                Instructions
              </FieldLabel>
              <Input
                {...field}
                value={field.value ?? ""}
                id="form-rhf-demo-instructions"
                aria-invalid={fieldState.invalid}
                placeholder="Answer briefly, cite sources, and ask before running anything destrucctive"
                autoComplete="off"
                className="min-h-24"
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>
      <DialogFooter>
        {bot && <BotDeleteDialog bot={bot} onDeleted={onSaved} />}
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          {bot ? "Save changes" : "Create bot"}
        </Button>
      </DialogFooter>
    </form>
  );
};

interface BotDeleteDialogProps {
  bot: Bot;
  onDeleted: () => void;
}

export const BotDeleteDialog = ({ bot, onDeleted }: BotDeleteDialogProps) => {
  const router = useRouter();
  const [open, setOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteBot(bot.id);
      toast.add({ type: "success", title: `${bot.name} has been deleted` });
      onDeleted();
      router.push("/");
    } catch {
      toast.add({
        type: "error",
        title: "Failed to delete bot",
        description: "Something went wrong while deleting the bot.",
      });
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
        <Trash2Icon />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete {bot.name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This deletes the bot and your chat with it. It can&apos;t be
            undone.{" "}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting && <Spinner />}
            Delete bot
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

interface BotDialogProps {
  bot?: Bot;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const BotDialog = ({
  bot,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: BotDialogProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const checkPaywall = usePaywall();

  const setOpen = (open: boolean) => {
    if (open && !bot && !checkPaywall("bots")) return;
    (onOpenChange ?? setUncontrolledOpen)(open);
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{bot ? "Edit Bot" : "Create Bot"}</DialogTitle>
          <DialogDescription>
            Give it a face, a name, and a job to do.
            {bot
              ? "Change its face, its name, or the job it does."
              : "Give it a face, a name, and a job to do."}
          </DialogDescription>
        </DialogHeader>
        <BotForm bot={bot} onSaved={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};
