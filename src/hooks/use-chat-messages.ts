import { useMemo } from "react";
import { trpc } from "~/utils/trpc";
import type { Message } from "~/server/db/schema";

interface UseChatMessagesProps {
  chatId: number;
  currentUserId: number;
}

export function useChatMessages({
  chatId,
  currentUserId,
}: UseChatMessagesProps): { messages: Message[]; isLoading: boolean } {
  const utils = trpc.useUtils();

  const { data: rawMessages = [], isLoading } =
    trpc.chat.getChatMessages.useQuery(
      { chatId: chatId },
      {
        enabled: !!chatId,
      },
    );

  const sortedMessages = useMemo(
    () =>
      [...rawMessages].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      ),
    [rawMessages],
  );

  trpc.chat.onNewMessage.useSubscription(
    { userId: currentUserId },
    {
      enabled: !!chatId,
      onData: (newMessageData) => {
        if (newMessageData.chat.id !== chatId) return;

        utils.chat.getChatMessages.setData({ chatId: chatId }, (existing) => {
          const messages = [...(existing ?? [])];
          if (newMessageData.lastMessage) {
            messages.push(newMessageData.lastMessage);
          }
          return messages.sort(
            (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
          );
        });
      },
      onError: (error) => {
        console.error("Subscription error (onNewMessage) in hook:", error);
      },
    },
  );

  return { messages: sortedMessages, isLoading };
}
