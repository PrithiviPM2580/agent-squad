"use client";

import React, { useState, useContext, createContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { Button } from "./ui/button";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Kbd } from "./ui/kbd";

const SearchCommandContext = createContext<() => void>(() => {});

interface SearchCommandProps {
  children: React.ReactNode;
}

export function SearchCommand({ children }: SearchCommandProps) {
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.key.toLocaleLowerCase() === "k" &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);
  return (
    <SearchCommandContext.Provider value={() => setOpen(false)}>
      <Button
        variant="outline"
        className="w-full min-w-0 justify-start border-input bg-transparent px-2.5 py-1 text-base font-normal text-muted-foreground md:text-sm"
        onClick={() => setOpen(true)}
      >
        <SearchIcon />
        Search
        <Kbd className="ml-auto">⌘K</Kbd>
      </Button>
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Search the chats"
      >
        <Command>
          <CommandInput placeholder="Search chats..." />
          <CommandList>
            <CommandEmpty>No chats found</CommandEmpty>
            <CommandGroup heading="Chats">{children}</CommandGroup>
          </CommandList>
        </Command>
      </CommandDialog>
    </SearchCommandContext.Provider>
  );
}

export const SearchCommandItem = ({
  href,
  ...props
}: Omit<React.ComponentProps<typeof CommandItem>, "OnSelect"> & {
  href: string;
}) => {
  const router = useRouter();
  const close = useContext(SearchCommandContext);

  return (
    <CommandItem
      {...props}
      onSelect={() => {
        close();
        router.push(href);
      }}
    />
  );
};
