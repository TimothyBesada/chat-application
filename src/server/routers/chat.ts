import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { router, protectedProcedure } from "~/server/trpc";
import {
  chats,
  chatParticipants,
  messages,
  users,
  type Message,
  type User,
  type Chat,
} from "~/server/db/schema";
import { desc, eq } from "drizzle-orm";
import { db } from "../db";
import { EventEmitter } from "events";
import { on } from "node:events";

type EventMap<T> = Record<keyof T, unknown[]>;
class IterableEventEmitter<T extends EventMap<T>> extends EventEmitter<T> {
  toIterable<TEventName extends keyof T & string>(
    eventName: TEventName,
    opts?: NonNullable<Parameters<typeof on>[2]>,
  ): AsyncIterable<T[TEventName]> {
    return on(this as EventEmitter, eventName, opts) as AsyncIterable<
      T[TEventName]
    >;
  }
}

export type ChatWithDetails = {
  chat: Chat;
  lastMessage: Message | null;
  participants: User[];
};
interface ChatEvents {
  newMessage: [chatData: ChatWithDetails, recipientUserIds: number[]];
  isTypingUpdate: [chatId: number, typingUsers: number[]];
  messageRead: [updatedMessage: Message, originalSenderId: number];
}

const ee = new IterableEventEmitter<ChatEvents>();

ee.setMaxListeners(0);

// Store typing state per chat
const typingUsers: Record<number, Record<number, { lastTyped: Date }>> = {};

// Cleanup typing state every 1 second
const interval = setInterval(() => {
  const now = Date.now();
  let updated = false;

  for (const [chatId, users] of Object.entries(typingUsers)) {
    for (const [userIdStr, value] of Object.entries(users)) {
      if (now - value.lastTyped.getTime() > 1000) {
        const userId = Number(userIdStr);
        delete users[userId];
        updated = true;
      }
    }
    // If chat has no typing users, remove the chat entry
    if (Object.keys(users).length === 0) {
      delete typingUsers[Number(chatId)];
    }
    if (updated) {
      ee.emit("isTypingUpdate", Number(chatId), Object.keys(users).map(Number));
    }
  }
}, 1000);

// Cleanup interval on server shutdown
process.on("SIGTERM", () => {
  clearInterval(interval);
});

export const chatRouter = router({
  getUsers: protectedProcedure.query(async () => {
    const usersResult = await db.select().from(users);
    return usersResult;
  }),

  getChats: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const userChats = await db
        .select({
          chat: chats,
          lastMessage: messages,
        })
        .from(chats)
        .where(eq(chatParticipants.userId, input.userId))
        .innerJoin(chatParticipants, eq(chats.id, chatParticipants.chatId))
        .leftJoin(
          messages,
          eq(
            messages.id,
            db
              .select({ id: messages.id })
              .from(messages)
              .where(eq(messages.chatId, chats.id))
              .orderBy(desc(messages.createdAt))
              .limit(1),
          ),
        )
        .orderBy(desc(messages.createdAt));

      // Get all participants for each chat
      const chatsWithParticipants = await Promise.all(
        userChats.map(async (chatData) => {
          const participants = await db
            .select({
              user: users,
            })
            .from(chatParticipants)
            .where(eq(chatParticipants.chatId, chatData.chat.id))
            .innerJoin(users, eq(chatParticipants.userId, users.id));

          if (!participants) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Failed to get participants",
            });
          }

          return {
            ...chatData,
            participants: participants.map((p) => p.user),
          };
        }),
      );

      return chatsWithParticipants;
    }),

  createChat: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        participantIds: z
          .array(z.number())
          .min(1, "At least 1 participant is required"),
        name: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const [chat] = await db
        .insert(chats)
        .values({ name: input.name })
        .returning();

      if (!chat) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to create chat",
        });
      }

      await db.insert(chatParticipants).values(
        [...input.participantIds, input.userId].map((userId) => ({
          userId,
          chatId: chat.id,
        })),
      );

      return {
        success: true,
        chat: {
          id: chat.id,
        },
      };
    }),

  getChatMessages: protectedProcedure
    .input(
      z.object({
        chatId: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const dbMessages = await db
        .select()
        .from(messages)
        .where(eq(messages.chatId, input.chatId))
        .orderBy(desc(messages.createdAt));

      return dbMessages;
    }),

  newMessage: protectedProcedure
    .input(
      z.object({
        chatId: z.number(),
        content: z.string(),
        userId: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      const [newMessageRecord] = await db
        .insert(messages)
        .values({
          userId: input.userId,
          chatId: input.chatId,
          content: input.content,
        })
        .returning();

      if (!newMessageRecord) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Failed to create message",
        });
      }

      // Fetch the chat details
      const [chatRecord] = await db
        .select()
        .from(chats)
        .where(eq(chats.id, input.chatId));
      if (!chatRecord) {
        // This case should ideally not happen if chatId is valid
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve chat details for the new message.",
        });
      }

      // Get all participant user objects for this chat
      const participantsData = await db
        .select({
          user: users,
        })
        .from(chatParticipants)
        .where(eq(chatParticipants.chatId, input.chatId))
        .innerJoin(users, eq(chatParticipants.userId, users.id));

      const participantUsers = participantsData.map((p) => p.user);
      const recipientUserIds = participantUsers.map((p) => p.id);

      const chatViewData: ChatWithDetails = {
        chat: chatRecord,
        lastMessage: newMessageRecord,
        participants: participantUsers,
      };

      ee.emit("newMessage", chatViewData, recipientUserIds);

      return newMessageRecord;
    }),

  isTyping: protectedProcedure
    .input(
      z.object({ chatId: z.number(), userId: z.number(), typing: z.boolean() }),
    )
    .mutation(({ input }) => {
      const { chatId, userId, typing } = input;

      typingUsers[chatId] ??= {};

      if (!typing) {
        delete typingUsers[chatId][userId];
      } else {
        typingUsers[chatId][userId] = {
          lastTyped: new Date(),
        };
      }

      ee.emit(
        "isTypingUpdate",
        chatId,
        Object.keys(typingUsers[chatId]).map(Number),
      );
    }),

  onIsTyping: protectedProcedure
    .input(
      z.object({
        chatId: z.number(),
      }),
    )
    .subscription(async function* ({ input }) {
      let prev: number[] | null = null;
      for await (const [updatedChatId, typingUserIds] of ee.toIterable(
        "isTypingUpdate",
      )) {
        if (updatedChatId === input.chatId) {
          if (!prev || prev.toString() !== typingUserIds.toString()) {
            yield typingUserIds;
          }
          prev = typingUserIds;
        }
      }
    }),

  onNewMessage: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
      }),
    )
    .subscription(async function* ({ input }) {
      for await (const [chatData, recipientUserIds] of ee.toIterable(
        "newMessage",
      )) {
        // Only emit if the user is a participant of the chat
        if (recipientUserIds.includes(input.userId)) {
          yield chatData; // Yield the full ChatWithDetails object
        }
      }
    }),

  getChatUsers: protectedProcedure
    .input(
      z.object({
        chatId: z.number(),
      }),
    )
    .query(async ({ input }) => {
      const chatUsers = await db
        .select({
          user: users,
        })
        .from(chatParticipants)
        .where(eq(chatParticipants.chatId, input.chatId))
        .innerJoin(users, eq(chatParticipants.userId, users.id));

      return chatUsers;
    }),
});
