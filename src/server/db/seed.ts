import { hashPassword } from "../auth/password";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import "dotenv/config";
import { chatParticipants, chats, users, type Chat } from "./schema";

const predefinedUsers = [
  {
    username: "user1",
    password: "user1",
  },
  {
    username: "user2",
    password: "user2",
  },
  {
    username: "user3",
    password: "user3",
  },
  {
    username: "user4",
    password: "user4",
  },
];

const predefinedChats = [
  {
    name: "general",
  },
  {
    name: "random",
  },
];

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is not set");
  }

  const db = drizzle(dbUrl);

  await seedUsers(db);

  await seedChats(db);

  console.log("✅ Seeding complete!");
}

async function seedUsers(db: PostgresJsDatabase) {
  console.log("🌱 Seeding database with predefined users...");

  const existingUsers = await db
    .select({ username: users.username })
    .from(users);
  const existingUsernames = new Set(existingUsers.map((u) => u.username));

  for (const user of predefinedUsers) {
    if (!existingUsernames.has(user.username)) {
      const passwordHash = await hashPassword(user.password);

      await db.insert(users).values({
        username: user.username,
        passwordHash,
      });

      console.log(`✅ Created user: ${user.username}`);
    } else {
      console.log(`⏭️ User ${user.username} already exists, skipping`);
    }
  }
}

async function seedChats(db: PostgresJsDatabase) {
  console.log("🌱 Seeding database with predefined chats...");

  const existingChats = await db.select({ name: chats.name }).from(chats);
  const existingChatNames = new Set(existingChats.map((c) => c.name));

  const allUsers = await db.select({ id: users.id }).from(users);

  for (const predefinedChat of predefinedChats) {
    if (!existingChatNames.has(predefinedChat.name)) {
      const [createdChat] = (await db
        .insert(chats)
        .values({ name: predefinedChat.name })
        .returning()) as [Chat];

      await db.insert(chatParticipants).values(
        allUsers.map((user) => ({
          chatId: createdChat.id,
          userId: user.id,
        })),
      );

      console.log(`✅ Created chat: ${predefinedChat.name}`);
    } else {
      console.log(`⏭️ Chat ${predefinedChat.name} already exists, skipping`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Error seeding database:");
    console.error(e);
    process.exit(1);
  });
