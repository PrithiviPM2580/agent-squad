import { Daytona, DaytonaNotFoundError } from "@daytona/sdk";

const VNC_PORT = 6080;

const daytona = new Daytona({
  apiKey: process.env.DAYTONA_API_KEY!,
  apiUrl: process.env.DAYTONA_API_URL ?? process.env.DATONA_API_URL!,
});

export async function createBotSandbox(botId: string) {
  const sandbox = await daytona.create({ labels: { botId } });
  return sandbox.id;
}

export async function getBotSandbox(botId: string) {
  const sandbox = await daytona.get(botId);
  if (sandbox.state !== "started") await sandbox.start();
  return sandbox;
}

export async function getBotDesktopUrl(sandboxId: string) {
  const sandbox = await getBotSandbox(sandboxId);

  const { status } = await sandbox.computerUse.getStatus();

  if (status !== "active") await sandbox.computerUse.start();

  const preview = await sandbox.getSignedPreviewUrl(VNC_PORT, 60 * 60);
  const url = new URL("/websockify", preview.url);
  url.protocol = "wss:";
  return url.toString();
}

export async function deleteBotSandbox(botId: string) {
  try {
    const sandbox = await daytona.get(botId);
    await daytona.delete(sandbox);
  } catch (error) {
    if (error instanceof DaytonaNotFoundError) return;
    throw error;
  }
}
