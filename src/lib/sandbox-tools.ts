import type { Sandbox } from "@daytona/sdk";
import type { InferChatUIMessageFromTools } from "@trigger.dev/sdk/ai";
import { tool } from "ai";
import path from "path";
import { file, z } from "zod";
import { getBotSandbox } from "./daytona";

const MAX_TEXT_LENGTH = 20000;

function truncate(text: string) {
  if (text.length <= MAX_TEXT_LENGTH) return text;
  return `${text.slice(0, MAX_TEXT_LENGTH)}\n... truncated ${text.length - MAX_TEXT_LENGTH} more characters`;
}

const point = {
  x: z.number().int().describe("Pixels from the left edge of the screen"),
  y: z.number().int().describe("Pixels from the top edge of the screen"),
};

async function takeScreenshot(sandbox: Sandbox) {
  const [shot, display] = await Promise.all([
    sandbox.computerUse.screenshot.takeCompressed({
      format: "jpeg",
      quality: 70,
      showCursor: true,
    }),
    sandbox.computerUse.display.getInfo(),
  ]);

  if (!shot.screenshot) throw new Error("Failed to take screenshot");

  const screen = display.displays?.[0];

  return {
    base64: shot.screenshot,
    mediaType: "image/jpeg",
    width: screen?.width ?? 0,
    height: screen?.height ?? 0,
  };
}

type Screenshot = Awaited<ReturnType<typeof takeScreenshot>>;

function screentshotToModelOutput({ output }: { output: Screenshot }) {
  return {
    type: "content" as const,
    value: [
      {
        type: "text" as const,
        text: `Screenshot of the ${output.width}x${output.height} screen. Coordinates are in the pixels from the top left.`,
      },
      {
        type: "file" as const,
        mediaType: output.mediaType,
        data: {
          type: "data" as const,
          data: output.base64,
        },
      },
    ],
  };
}

export function createSandboxTools(getSandboxId: () => Promise<string>) {
  let sandbox: Promise<Sandbox> | undefined;
  let desktop: Promise<Sandbox> | undefined;

  function getSandbox() {
    sandbox ??= getSandboxId()
      .then(getBotSandbox)
      .catch((err) => {
        sandbox = undefined;
        throw err;
      });

    return sandbox;
  }

  function getDesktop() {
    desktop ??= getSandbox()
      .then(async (sandbox) => {
        const { status } = await sandbox.computerUse.getStatus();
        if (status !== "active") await sandbox.computerUse.start();
        return sandbox;
      })
      .catch((err) => {
        desktop = undefined;
        throw err;
      });
    return desktop;
  }

  return {
    bash: tool({
      description:
        "Run a shell command in your sandbox and get its output and exit code. Commands start in your home directory unless you pass cwd, and each call is a fresh shell.",
      inputSchema: z.object({
        command: z.string().describe("The shell command to run"),
        cwd: z
          .string()
          .optional()
          .describe("The working directory to run the command in"),
        timeout: z
          .number()
          .int()
          .min(1)
          .max(600)
          .optional()
          .describe("Seconds to wait before giving up. Defaults to 60."),
      }),
      execute: async ({ command, cwd, timeout = 60 }) => {
        const sandbox = await getSandbox();
        const response = await sandbox.process.executeCommand(
          command,
          cwd?.replace(/^~(\/|$)/, "") || undefined,
          undefined,
          timeout,
        );

        return {
          exitCode: response.exitCode,
          output: truncate(response.result),
        };
      },
    }),
    readFile: tool({
      description: "Read a text file from your sandbox.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("File path. absoulte or relative to your home directory."),
      }),
      execute: async ({ path }) => {
        const sandbox = await getSandbox();
        const file = await sandbox.fs.downloadFile(path);
        return {
          content: truncate(file.toString("utf8")),
        };
      },
    }),
    writeFile: tool({
      description:
        "Write  a text file in your sandbox, creating it and any missing folders, or replacing it if it exists.",
      inputSchema: z.object({
        path: z
          .string()
          .describe("File path, absoulte or relative to your home directory."),
        content: z.string().describe("The content to write to the file."),
      }),
      execute: async ({ path, content }) => {
        const sandbox = await getSandbox();
        const file = Buffer.from(content, "utf8");
        await sandbox.fs.uploadFile(file, path);
        return {
          path,
          bytes: file.byteLength,
        };
      },
    }),
    listFiles: tool({
      description: "List the files and folders in a directory of your sandbox.",
      inputSchema: z.object({
        path: z
          .string()
          .default(".")
          .describe(
            "Directory path, absoulte or relative to your home directory.",
          ),
      }),
      execute: async ({ path }) => {
        const sandbox = await getSandbox();
        const files = await sandbox.fs.listFiles(path);
        return {
          files: files.map((f) => ({
            name: f.name,
            isDir: f.isDir,
            size: f.size,
          })),
        };
      },
    }),
    mouseClick: tool({
      description:
        "Click a mouse at a point on your sandbox's desktop. Look at the screen first to find the coordinates.",
      inputSchema: z.object({
        ...point,
        button: z
          .enum(["left", "right", "middle"])
          .default("left")
          .describe("Which mouse button to click with."),
        double: z.boolean().default(false).describe("Whether to double click."),
      }),
      execute: async ({ x, y, button, double }) => {
        const sandbox = await getDesktop();
        await sandbox.computerUse.mouse.click(x, y, button, double);
        return {
          x,
          y,
        };
      },
    }),
    mouseMove: tool({
      description:
        "Move the mouse cursor to a point on your sandbox's desktop without clicking.",
      inputSchema: z.object(point),
      execute: async ({ x, y }) => {
        const sandbox = await getDesktop();
        await sandbox.computerUse.mouse.move(x, y);
        return {
          x,
          y,
        };
      },
    }),
    mouseDrag: tool({
      description:
        "Press the left mouse button  at one point on your sandbox's desktop, drag to another and release.",
      inputSchema: z.object({
        startX: point.x,
        startY: point.y,
        endX: point.x,
        endY: point.y,
      }),
      execute: async ({ startX, startY, endX, endY }) => {
        const sandbox = await getDesktop();
        await sandbox.computerUse.mouse.drag(startX, startY, endX, endY);
        return {
          x: endX,
          y: endY,
        };
      },
    }),
    mouseScroll: tool({
      description:
        "Scroll the mouse wheel at a point on your sandbox's desktop.",
      inputSchema: z.object({
        ...point,
        direction: z
          .enum(["up", "down"])
          .describe("Which direction to scroll."),
        amount: z
          .number()
          .int()
          .min(1)
          .max(50)
          .default(3)
          .describe("Wheel notches; each notch is about 3 lines of text."),
      }),
      execute: async ({ x, y, direction, amount }) => {
        const sandbox = await getDesktop();
        await sandbox.computerUse.mouse.scroll(x, y, direction, amount);
        return {
          x,
          y,
          direction,
          amount,
        };
      },
    }),
    keyboardType: tool({
      description:
        "Type text into whatever has keyboard focus on your sandbox's desktop. Newlines are typed as Enter",
      inputSchema: z.object({
        text: z
          .string()
          .describe("The text to type. Newlines are typed as Enter."),
      }),
      execute: async ({ text }) => {
        const sandbox = await getDesktop();
        await sandbox.computerUse.keyboard.type(text);
        return {
          types: text.length,
        };
      },
    }),
    keyboardPress: tool({
      description:
        "Press a single key on your sandbox's desktop, optionally with modifiers held, e.g. key 'enter', or key 'c' with modifiers ['ctrl'].",
      inputSchema: z.object({
        key: z
          .string()
          .describe(
            "A key name: a letter or digit, enter, escape, tab, backspace, delete, space, up, down, left, right, home, end, pageup, pagedown, f1-f12",
          ),
        modifiers: z.array(z.enum(["ctrl", "alt", "shift", "cmd"])).default([]),
      }),
      execute: async ({ key, modifiers }) => {
        const sandbox = await getDesktop();
        await sandbox.computerUse.keyboard.press(key, modifiers);
        return {
          key,
          modifiers,
        };
      },
    }),
    viewScreen: tool({
      description:
        "Look at your sandbox's desktop yourself. Use this whenever you need to see the screen to do your work, such as before clicking and after an action to check what happened. The person you are talking to does not see this screenshot.",
      inputSchema: z.object({}),
      execute: async () => takeScreenshot(await getDesktop()),
      toModelOutput: screentshotToModelOutput,
    }),
    showScreen: tool({
      description:
        "Show your sandbox's desktop to the person you are talking to: the screenshot appears in the chat, and you see it too. Use this only when they ask to see the screen or what is on it.",
      inputSchema: z.object({}),
      execute: async () => takeScreenshot(await getDesktop()),
      toModelOutput: screentshotToModelOutput,
    }),
  };
}

export type SandboxTools = ReturnType<typeof createSandboxTools>;
export type ChatUIMessage = InferChatUIMessageFromTools<SandboxTools>;
