import { useState, useMemo } from "react";
import type { PartialUser } from "~/store/auth-store";
import { trpc } from "~/utils/trpc";

interface UseTypingStatusProps {
  chatId: number | undefined;
  participants: PartialUser[];
  currentUserId: number;
}

interface TypingStatusResult {
  typingUserIds: number[];
  typingMessage: string | null;
}

export function useTypingStatus({
  chatId,
  participants,
  currentUserId,
}: UseTypingStatusProps): TypingStatusResult {
  const [rawTypingUserIds, setRawTypingUserIds] = useState<number[]>([]);

  trpc.chat.onIsTyping.useSubscription(
    { chatId: chatId! },
    {
      enabled: !!chatId,
      onData: (newUserIds) => {
        const sortedNewUserIds = [...newUserIds].sort();
        setRawTypingUserIds((prevUserIds) => {
          const sortedPrevUserIds = [...prevUserIds].sort();
          if (
            JSON.stringify(sortedNewUserIds) !==
            JSON.stringify(sortedPrevUserIds)
          ) {
            return sortedNewUserIds;
          }
          return prevUserIds;
        });
      },
      onError: (err) => {
        console.error(
          `Error in onIsTyping subscription for chat ${chatId}:`,
          err,
        );
        setRawTypingUserIds([]);
      },
    },
  );

  const typingUserIds = useMemo(() => rawTypingUserIds, [rawTypingUserIds]);

  const { typingMessage } = useMemo(() => {
    const otherTypingUsers = participants.filter(
      (p) => typingUserIds.includes(p.id) && p.id !== currentUserId,
    );

    if (otherTypingUsers.length === 0) {
      return { typingMessage: null };
    }

    const names = otherTypingUsers.map((u) => u.username).join(", ");
    const verb = otherTypingUsers.length === 1 ? "is" : "are";
    return {
      typingMessage: `${names} ${verb} typing...`,
    };
  }, [typingUserIds, participants, currentUserId]);

  return { typingUserIds, typingMessage };
}
