import { router } from "../trpc";
import { chatRouter } from "./chat";
import { authRouter } from "./auth";

export const appRouter = router({
  auth: authRouter,

  chat: chatRouter,
});

export type AppRouter = typeof appRouter;
