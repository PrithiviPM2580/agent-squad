import { auth } from "@clerk/nextjs/server";
import type { UIMessage } from "ai";
import { streamWithFallback } from "@/lib/stream-with-fallback";

export async function POST(req: Request) {
  const { isAuthenticated } = await auth();

  if (!isAuthenticated) {
    throw new Response("Unauthorized", { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await req.json();

  return streamWithFallback({ messages });
}
