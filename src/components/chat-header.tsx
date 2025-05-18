import React from "react";
import { ArrowLeft, Circle } from "lucide-react";
import { Button } from "~/components/ui/button";
import { generateAvatarFallback } from "~/lib/utils";
import useChatStore from "~/store/chat-store";

import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import type { User } from "~/server/db/schema";
import { type PartialUser } from "~/store/auth-store";

export function ChatHeader({
  participants,
  currentUser,
  chatName,
}: {
  participants: User[];
  currentUser: PartialUser;
  chatName: string | null;
}) {
  const { setSelectedChat } = useChatStore();

  const participantNames = participants
    .filter((p) => p.id !== currentUser?.id)
    .map((p) => p.username);

  const displayNames = participantNames.join(", ");
  return (
    <div className="flex justify-between gap-4 lg:px-4">
      <div className="flex gap-4">
        <Button
          size="sm"
          variant="outline"
          className="flex size-10 p-0 lg:hidden"
          onClick={() => setSelectedChat(null)}
        >
          <ArrowLeft />
        </Button>
        <Avatar className="size-10 overflow-visible lg:size-12">
          <AvatarFallback>
            {generateAvatarFallback(chatName ?? displayNames)}
          </AvatarFallback>
        </Avatar>
        <div className="flex gap-2">
          {chatName ? (
            <span className="flex items-center gap-1 font-semibold">
              {chatName}
            </span>
          ) : (
            participants.map((user) => (
              <span
                key={user.id}
                className="flex items-center gap-1 font-semibold"
              >
                {user.username}
                <Circle fill="gray" className="size-2" />
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
