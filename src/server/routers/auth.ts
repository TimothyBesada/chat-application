import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { router, publicProcedure } from "~/server/trpc";
import { users } from "~/server/db/schema";
import { verifyPassword } from "~/server/auth/password";
import { eq } from "drizzle-orm";
import { db } from "../db";

export const authRouter = router({
  login: publicProcedure
    .input(
      z.object({
        username: z.string(),
        password: z.string(),
      }),
    )
    .mutation(async ({ input }) => {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, input.username));

      if (!user) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid username or password",
        });
      }

      const isPasswordValid = await verifyPassword(
        input.password,
        user.passwordHash,
      );

      if (!isPasswordValid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid username or password",
        });
      }

      return {
        success: true,
        user,
      };
    }),
});
