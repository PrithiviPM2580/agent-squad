"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { toast } from "@/components/ui/toast";
import type { Feature } from "@/types";
import { useCallback } from "react";

const messages: Record<Feature, string> = {
  bots: "Bots are the part of the paid plan.",
  sandboxes: "Sandboxes are the part of the paid plan.",
};

export function usePaywall() {
  const { isLoaded, has } = useAuth();

  const router = useRouter();

  return useCallback(
    (feature: Feature) => {
      if (!isLoaded || has?.({ feature })) return true;

      const id = toast.add({
        type: "error",
        title: "Upgrade required",
        description: messages[feature],
        actionProps: {
          children: "See plans",
          onClick: () => {
            toast.close(id);
            router.push("/pricing");
          },
        },
      });

      return false;
    },
    [isLoaded, has, router],
  );
}
