import { SendIcon } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "~/utils/trpc";
import useChatStore from "~/store/chat-store";
import { type PartialUser } from "~/store/auth-store";

export function ChatForm({ currentUser }: { currentUser: PartialUser }) {
  const [message, setMessage] = useState("");
  const { selectedChat, setLastMessage } = useChatStore();
  const chatId = selectedChat?.chat.id;

  const utils = trpc.useUtils();
  const createMessage = trpc.chat.newMessage.useMutation({
    onSuccess: async (result) => {
      setMessage("");
      if (chatId) await utils.chat.getChatMessages.invalidate({ chatId });
      if (result) {
        setLastMessage(result);
      }
    },
  });

  const isTypingMutation = trpc.chat.isTyping.useMutation();

  const isTypingMutationRef = useRef(isTypingMutation);
  useEffect(() => {
    isTypingMutationRef.current = isTypingMutation;
  }, [isTypingMutation]);

  const notifyTyping = useCallback(
    (typing: boolean) => {
      if (chatId) {
        isTypingMutationRef.current.mutate({
          chatId,
          userId: currentUser.id,
          typing,
        });
      }
    },
    [chatId, currentUser.id],
  );

  useEffect(() => {
    const currentChatId = chatId;
    const currentUserId = currentUser.id;

    return () => {
      if (currentChatId) {
        isTypingMutationRef.current.mutate({
          chatId: currentChatId,
          userId: currentUserId,
          typing: false,
        });
      }
    };
  }, [chatId, currentUser.id]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !chatId) return;

    notifyTyping(false);

    createMessage.mutate({
      chatId,
      content: message.trim(),
      userId: currentUser.id,
    });
  };

  const handleIsTyping = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newMessage = e.target.value;
      setMessage(newMessage);

      if (newMessage.trim().length > 0) {
        notifyTyping(true);
      } else {
        notifyTyping(false);
      }
    },
    [notifyTyping],
  );

  return (
    <div className="lg:px-4">
      <form
        onSubmit={handleSendMessage}
        className="bg-muted relative flex items-center rounded-md border"
      >
        <Input
          type="text"
          className="h-14 border-transparent bg-white pe-32 text-base! shadow-transparent! ring-transparent! lg:pe-56"
          placeholder="Enter message..."
          value={message}
          onChange={handleIsTyping}
        />
        <div className="absolute end-4 flex items-center">
          <Button
            type="submit"
            variant="outline"
            className="ms-3"
            disabled={!message.trim() || !chatId || createMessage.isPending}
          >
            <span className="hidden lg:inline">Send</span>{" "}
            <SendIcon className="inline lg:hidden" />
          </Button>
        </div>
      </form>
    </div>
  );
}
