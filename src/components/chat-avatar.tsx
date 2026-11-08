import { Avatar, Style } from "@dicebear/core";
import defination from "@dicebear/styles/gaze.json" with { type: "json" };
import { cn } from "cn";
import Image from "next/image";

const style = new Style(defination);

interface ChatAvatarProps {
  seed: string;
  animated?: boolean;
  className?: string;
}

export const ChatAvatar = ({
  seed,
  animated = false,
  className,
}: ChatAvatarProps) => {
  const avatar = new Avatar(style, {
    seed,
    ...(animated && { tags: ["animation"] }),
  });

  return (
    <Image
      src={avatar.toDataUri()}
      alt="Avatar"
      width={32}
      height={32}
      unoptimized
      className={cn("size-8 shrink-0", className)}
    />
  );
};
