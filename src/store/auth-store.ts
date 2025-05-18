"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "~/server/db/schema";

export type PartialUser = Pick<User, "id" | "username" | "lastSeenAt">;

interface AuthState {
  currentUser: PartialUser | null;
  setCurrentUser: (user: PartialUser | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentUser: null,
      setCurrentUser: (user: PartialUser | null) => set({ currentUser: user }),
    }),
    {
      name: "auth-storage",
    },
  ),
);
