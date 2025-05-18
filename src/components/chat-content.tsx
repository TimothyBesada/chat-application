import { useEffect, useRef } from "react";

import { ChatHeader } from "~/components/chat-header";
import { ChatBubble } from "~/components/chat-bubble";
import { ChatForm } from "~/components/chat-form";
import { type PartialUser } from "~/store/auth-store";
import { useTypingStatus } from "~/hooks/use-typing-status";
import { useChatMessages } from "~/hooks/use-chat-messages";
import type { ChatWithDetails } from "~/server/routers/chat";

export function ChatContent({
  currentUser,
  selectedChat,
}: {
  currentUser: PartialUser;
  selectedChat: ChatWithDetails;
}) {
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const { messages: displayMessages, isLoading } = useChatMessages({
    chatId: selectedChat.chat.id,
    currentUserId: currentUser.id,
  });

  const { typingMessage } = useTypingStatus({
    chatId: selectedChat.chat.id,
    participants: selectedChat.participants,
    currentUserId: currentUser.id,
  });

  useEffect(() => {
    if (messagesContainerRef.current && displayMessages.length > 0) {
      messagesContainerRef.current.scrollIntoView(false);
    }
  }, [displayMessages]);

  return (
    <div className="fixed inset-0 z-50 flex h-full flex-col rounded-lg bg-gray-50 p-4 lg:relative lg:z-10 lg:p-0">
      <ChatHeader
        currentUser={currentUser}
        participants={selectedChat.participants}
        chatName={selectedChat.chat.name}
      />
      <div className="flex-1 overflow-y-auto lg:px-4">
        <div ref={messagesContainerRef}>
          <div className="flex flex-col items-start space-y-10 py-8">
            {displayMessages.length > 0 ? (
              displayMessages.map((item, key) => (
                <ChatBubble
                  currentUser={currentUser}
                  message={item}
                  key={key}
                />
              ))
            ) : (
              <div className="text-muted-foreground mt-4 text-center text-sm">
                {isLoading ? "Loading messages..." : "No messages yet"}
              </div>
            )}
          </div>
        </div>
      </div>
      {typingMessage && (
        <div className="text-muted-foreground mb-2 text-sm italic">
          {typingMessage}
        </div>
      )}
      <ChatForm currentUser={currentUser} />
    </div>
  );
}
