import { relations, sql } from "drizzle-orm";
import { index, pgTable, primaryKey } from "drizzle-orm/pg-core";

export const users = pgTable(
  "user",
  (d) => ({
    id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
    username: d.varchar({ length: 128 }).notNull().unique(),
    passwordHash: d.text().notNull(),
    lastSeenAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    createdAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  }),
  (t) => [index("username_idx").on(t.username)],
);

export const chats = pgTable("chat", (d) => ({
  id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
  createdAt: d
    .timestamp({ withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
  name: d.text(),
}));

export const chatParticipants = pgTable(
  "chat_participant",
  (d) => ({
    userId: d
      .integer()
      .notNull()
      .references(() => users.id),
    chatId: d
      .integer()
      .notNull()
      .references(() => chats.id),
    joinedAt: d
      .timestamp({ withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  }),
  (t) => [
    primaryKey({ columns: [t.userId, t.chatId] }),
    index("chat_participant_user_id_idx").on(t.userId),
    index("chat_participant_chat_id_idx").on(t.chatId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  chatParticipants: many(chatParticipants),
}));

export const chatsRelations = relations(chats, ({ many }) => ({
  chatParticipants: many(chatParticipants),
}));

export const chatParticipantsRelations = relations(
  chatParticipants,
  ({ one }) => ({
    user: one(users, {
      fields: [chatParticipants.userId],
      references: [users.id],
    }),
    chat: one(chats, {
      fields: [chatParticipants.chatId],
      references: [chats.id],
    }),
  }),
);

export const messages = pgTable("message", (d) => ({
  id: d.integer().primaryKey().generatedByDefaultAsIdentity(),
  content: d.text().notNull(),
  userId: d
    .integer()
    .references(() => users.id)
    .notNull(),
  chatId: d
    .integer()
    .references(() => chats.id)
    .notNull(),
  createdAt: d
    .timestamp({ withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: d.timestamp({ withTimezone: true }).$onUpdate(() => new Date()),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;

export type ChatParticipant = typeof chatParticipants.$inferSelect;
export type NewChatParticipant = typeof chatParticipants.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
