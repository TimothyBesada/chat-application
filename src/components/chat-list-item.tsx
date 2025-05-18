import { cn, generateAvatarFallback } from "~/lib/utils";
import useChatStore from "~/store/chat-store";

import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import { type PartialUser } from "~/store/auth-store";
import { useTypingStatus } from "~/hooks/use-typing-status";
import { type ChatWithDetails } from "~/server/routers/chat";

export function ChatListItem({
  chat,
  active,
  currentUser,
}: {
  chat: ChatWithDetails;
  active: boolean | null;
  currentUser: PartialUser;
}) {
  const { setSelectedChat } = useChatStore();

  const { typingMessage } = useTypingStatus({
    chatId: chat.chat.id,
    participants: chat.participants,
    currentUserId: currentUser.id,
  });

  const handleClick = (chat: ChatWithDetails) => {
    setSelectedChat(chat);
  };

  const participantNames = chat.participants
    .filter((p) => p.id !== currentUser?.id)
    .map((p) => p.username)
    .join(", ");

  return (
    <div
      className={cn(
        "hover:bg-muted group/item relative flex min-w-0 cursor-pointer items-center gap-4 px-6 py-4",
        { "dark:bg-muted! bg-gray-200!": active },
      )}
      onClick={() => handleClick(chat)}
    >
      <Avatar className="overflow-visible md:size-12">
        <AvatarFallback>
          {generateAvatarFallback(chat.chat.name ?? participantNames)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 grow">
        <div className="flex items-center justify-between">
          <span className="truncate font-medium">
            {chat.chat.name ?? participantNames}
          </span>
          <span className="text-muted-foreground flex-none text-xs">
            {chat.lastMessage?.createdAt.toLocaleDateString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {typingMessage ? (
            <span className="text-primary truncate text-start text-sm font-medium italic">
              {typingMessage}
            </span>
          ) : (
            <span className="text-muted-foreground truncate text-start text-sm">
              {chat.lastMessage?.content ?? "No messages yet"}
            </span>
          )}
        </div>
      </div>
      <div
        className={cn(
          "absolute end-0 top-0 bottom-0 flex items-center bg-linear-to-l from-50% px-4 opacity-0 group-hover/item:opacity-100",
          { "from-muted": !active },
          { "dark:from-muted from-gray-200": active },
        )}
      ></div>
    </div>
  );
}
