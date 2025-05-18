import React, { useEffect, useState } from "react";
import { PlusIcon, Search } from "lucide-react";
import useChatStore from "~/store/chat-store";

import { Input } from "~/components/ui/input";
import { ChatListItem } from "~/components/chat-list-item";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { trpc } from "~/utils/trpc";
import { useAuthStore } from "~/store/auth-store";
import { Button } from "./ui/button";
import { type PartialUser } from "~/store/auth-store";
import { CreateChatModal } from "./create-chat-modal";
import type { ChatWithDetails } from "~/server/routers/chat";

export function ChatSidebar({ currentUser }: { currentUser: PartialUser }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { setCurrentUser } = useAuthStore();
  const { data: chatsResult, isLoading: isLoadingChats } =
    trpc.chat.getChats.useQuery({
      userId: currentUser.id,
    });
  const { selectedChat, setChats, chats, addOrUpdateChat } = useChatStore();

  const [filteredChats, setFilteredChats] = React.useState<
    ChatWithDetails[] | undefined
  >(undefined);

  useEffect(() => {
    if (chatsResult) {
      const sortedChats = chatsResult.sort((a, b) => {
        // If either chat is missing a last message, sort by chat creation date
        if (!a.lastMessage || !b.lastMessage) {
          return b.chat.createdAt.getTime() - a.chat.createdAt.getTime();
        }

        // Sort by message date first, then chat creation date as tiebreaker
        const messageTimeDiff =
          b.lastMessage.createdAt.getTime() - a.lastMessage.createdAt.getTime();

        return (
          messageTimeDiff ||
          b.chat.createdAt.getTime() - a.chat.createdAt.getTime()
        );
      });
      setChats(sortedChats);
    }
  }, [chatsResult, setChats]);

  useEffect(() => {
    setFilteredChats(chats);
  }, [chats]);

  trpc.chat.onNewMessage.useSubscription(
    { userId: currentUser.id },
    {
      onData: (newChatData) => {
        addOrUpdateChat(newChatData);
      },
      onError: (err) => {
        console.error("Subscription error (onNewMessage):", err);
      },
    },
  );

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const changeHandle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value.trim();

    const currentChats = chats ?? [];
    const filteredItems =
      currentChats?.filter((chatItem) =>
        chatItem.participants.some(
          (participant) =>
            participant.username
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) &&
            participant.id !== currentUser.id,
        ),
      ) ?? [];
    setFilteredChats(filteredItems);
  };

  return (
    <Card className="w-full pb-0 lg:w-96">
      <CardHeader>
        <CardTitle className="font-display flex text-xl lg:text-2xl">
          <div>
            Chats
            <div className="text-sm">
              {currentUser.username}
              <Button
                variant="link"
                size="sm"
                className="text-sm"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-4"></div>
        </CardTitle>
        <CardAction>
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            onClick={() => setIsModalOpen(true)}
          >
            <PlusIcon />
          </Button>
          <CreateChatModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            currentUser={currentUser}
          />
        </CardAction>
        <CardDescription className="relative col-span-2 mt-4 flex w-full items-center">
          <Search className="text-muted-foreground absolute start-4 size-4" />
          <Input
            type="text"
            className="ps-10"
            placeholder="Search..."
            onChange={changeHandle}
          />
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 overflow-auto p-0">
        <div className="block min-w-0 divide-y">
          {isLoadingChats && (
            <div className="text-muted-foreground mt-4 p-4 text-center text-sm">
              Loading chats...
            </div>
          )}
          {!isLoadingChats && !filteredChats?.length && (
            <div className="text-muted-foreground mt-4 p-4 text-center text-sm">
              No chat found
            </div>
          )}
          {filteredChats?.map((chat, key) => (
            <ChatListItem
              currentUser={currentUser}
              active={selectedChat && selectedChat.chat.id === chat.chat.id}
              chat={chat}
              key={key}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
