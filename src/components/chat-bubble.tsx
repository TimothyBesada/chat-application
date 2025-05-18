import { cn } from "~/lib/utils";
import type { Message } from "~/server/db/schema";
import { type PartialUser } from "~/store/auth-store";

export function ChatBubble({
  message,
  currentUser,
}: {
  message: Message;
  currentUser: PartialUser;
}) {
  const ownMessage = message.userId === currentUser.id;

  return (
    <div
      className={cn("max-w-(--breakpoint-sm) space-y-1", {
        "self-end": ownMessage,
      })}
    >
      <div className="flex items-center justify-end gap-2">
        <div
          className={cn("bg-muted inline-flex rounded-md border p-4", {
            "order-1": ownMessage,
          })}
        >
          {message.content}
        </div>
      </div>
      <div
        className={cn("flex items-center gap-2", {
          "justify-end": ownMessage,
        })}
      >
        <time
          className={cn(
            "text-muted-foreground mt-1 flex items-center text-xs",
            {
              "justify-end": ownMessage,
            },
          )}
        >
          {message.createdAt.toLocaleTimeString("sv-SE", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </div>
    </div>
  );
}
