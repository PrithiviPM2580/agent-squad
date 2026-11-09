"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ShuffleIcon } from "lucide-react";
import { nanoid } from "nanoid";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { createBot } from "@/actions/bot";
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
import { type BotInsert, botInsertSchema } from "@/db/schema";
import { PRESENTS } from "@/lib/constant";
import { ChatAvatar } from "./chat-avatar";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Spinner } from "./ui/spinner";
import { toast } from "./ui/toast";

interface BotFormProps {
  onCreated: () => void;
}

export const BotForm = ({ onCreated }: BotFormProps) => {
  const [initialSeed] = useState(() => nanoid());
  const form = useForm<BotInsert>({
    resolver: zodResolver(botInsertSchema),
    defaultValues: {
      name: "",
      avatar: initialSeed,
      job: "",
      instructions: "",
    },
  });

  const { isSubmitting } = form.formState;

  const onSubmit = async (values: BotInsert) => {
    try {
      const bot = await createBot(values);
      toast.add({ type: "success", title: `${bot.name} is ready` });
      onCreated();
    } catch {
      toast.add({
        type: "error",
        title: "Failed to create bot",
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
        <DialogClose render={<Button type="button" variant="outline" />}>
          Cancel
        </DialogClose>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Spinner />}
          Create bot
        </Button>
      </DialogFooter>
    </form>
  );
};

interface BotDialogProps {
  children?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const BotDialog = ({
  children,
  open: controlledOpen,
  onOpenChange,
}: BotDialogProps) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState<boolean>(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger render={children} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Bot</DialogTitle>
          <DialogDescription>
            Give it a face, a name, and a job to do.
          </DialogDescription>
        </DialogHeader>
        <BotForm onCreated={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
};
