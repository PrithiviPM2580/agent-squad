import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { MODELS } from "./constant";

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

type StreamWithFallbackOptions = {
  messages: UIMessage[];
  models?: readonly string[];
  system?: string;
};

export async function streamWithFallback({
  messages,
  models = MODELS,
  system,
}: StreamWithFallbackOptions): Promise<Response> {
  let lastError: unknown;

  const modelMessages = await convertToModelMessages(messages);

  for (const modelId of models) {
    try {
      const result = streamText({
        model: openrouter.chat(modelId),
        instructions: system,
        messages: modelMessages,
        streamRetries: 2,
      });

      return createUIMessageStreamResponse({
        stream: toUIMessageStream({
          stream: result.stream,
          onError: (error) =>
            error instanceof Error ? error.message : String(error),
        }),
      });
    } catch (error) {
      lastError = error;
      console.warn(`Model ${modelId} failed to start, trying next...`);
    }
  }

  console.error("All models failed:", lastError);
  return new Response("All models failed", { status: 500 });
}
