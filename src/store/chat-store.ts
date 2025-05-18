import { create } from "zustand";
import type { Message } from "~/server/db/schema";
import { type ChatWithDetails } from "~/server/routers/chat";

interface ChatStore {
  chats: ChatWithDetails[];
  selectedChat: ChatWithDetails | null;
  setSelectedChat: (chat: ChatWithDetails | null) => void;
  setChats: (chats: ChatWithDetails[]) => void;
  setLastMessage: (message: Message) => void;
  addOrUpdateChat: (chatData: ChatWithDetails) => void;
}

const useChatStore = create<ChatStore>((set) => ({
  chats: [],
  selectedChat: null,
  setSelectedChat: (chat) => set(() => ({ selectedChat: chat })),
  setChats: (chats) => set(() => ({ chats })),
  setLastMessage: (message) =>
    set((state) => {
      const updatedChats = state.chats.map((chat) =>
        chat.chat.id === message.chatId
          ? { ...chat, lastMessage: message }
          : chat,
      );
      updatedChats.sort((a, b) => {
        const timeA = a.lastMessage
          ? new Date(a.lastMessage.createdAt).getTime()
          : 0;
        const timeB = b.lastMessage
          ? new Date(b.lastMessage.createdAt).getTime()
          : 0;

        if (timeB !== timeA) {
          return timeB - timeA;
        }
        return (
          new Date(b.chat.createdAt).getTime() -
          new Date(a.chat.createdAt).getTime()
        );
      });

      return {
        chats: updatedChats,
      };
    }),
  addOrUpdateChat: (chatData) =>
    set((state) => {
      const updatedChats = [...state.chats];
      const existingChatIndex = updatedChats.findIndex(
        (c) => c.chat.id === chatData.chat.id,
      );

      if (existingChatIndex !== -1) {
        updatedChats[existingChatIndex] = {
          ...updatedChats[existingChatIndex],
          ...chatData,
          lastMessage: chatData.lastMessage,
          participants: chatData.participants,
        };
      } else {
        updatedChats.push(chatData);
      }

      updatedChats.sort((a, b) => {
        const timeA = a.lastMessage?.createdAt
          ? new Date(a.lastMessage.createdAt).getTime()
          : 0;
        const timeB = b.lastMessage?.createdAt
          ? new Date(b.lastMessage.createdAt).getTime()
          : 0;

        if (timeB !== timeA) {
          return timeB - timeA;
        }
        const chatTimeA = new Date(a.chat.createdAt).getTime();
        const chatTimeB = new Date(b.chat.createdAt).getTime();
        return chatTimeB - chatTimeA;
      });

      return { chats: updatedChats };
    }),
}));

export default useChatStore;
