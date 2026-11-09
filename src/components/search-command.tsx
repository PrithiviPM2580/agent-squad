"use client";

import { SearchIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

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
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "./ui/sidebar";

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
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            variant="outline"
            tooltip="Search"
            onClick={() => setOpen(true)}
            className="text-muted-foreground group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:text-sidebar-foreground group-data-[collapsible=icon]:shadow-none group-data-[collapsible=icon]:hover:bg-sidebar-accent"
          >
            <SearchIcon />
            <span>Search</span>
            <Kbd className="ml-auto">⌘K</Kbd>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
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
