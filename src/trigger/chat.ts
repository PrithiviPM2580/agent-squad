import { chat } from "@trigger.dev/sdk/ai";
import { stepCountIs } from "ai";
import { MODELS } from "@/lib/constant";
import { openrouter } from "@/lib/open-router";

export const chatAgent = chat.agent({
  id: "chat",
  run: async ({ messages, signal, streamText }) =>
    streamText({
      model: openrouter.chat(MODELS[4]),
      messages,
      abortSignal: signal,
      stopWhen: stepCountIs(15),
    }),
});
