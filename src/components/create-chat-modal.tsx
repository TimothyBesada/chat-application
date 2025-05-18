import { useState } from "react";
import { SearchIcon, XIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { trpc } from "~/utils/trpc";
import { type User } from "~/server/db/schema";
import useChatStore from "~/store/chat-store";
import { type PartialUser } from "~/store/auth-store";

interface CreateChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: PartialUser;
}

export function CreateChatModal({
  isOpen,
  onClose,
  currentUser,
}: CreateChatModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [chatName, setChatName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { setSelectedChat } = useChatStore();

  const { data: users = [] } = trpc.chat.getUsers.useQuery();
  const createChatMutation = trpc.chat.createChat.useMutation({
    onSuccess: (data) => {
      // Refetch chats to get the new chat with participants
      void chatQuery.refetch().then((result) => {
        // Use the updated data from the refetch result
        const newChat = result.data?.find(
          (chat) => chat.chat.id === data.chat.id,
        );
        if (newChat) {
          setSelectedChat(newChat);
        }
        onClose();
      });
    },
  });

  const chatQuery = trpc.chat.getChats.useQuery({
    userId: currentUser.id,
  });

  const filteredUsers = users.filter((user) => {
    const isCurrentUser = user.id === currentUser?.id;
    if (isCurrentUser) return false;

    const isSelected = selectedUsers.some(
      (selectedUser) => selectedUser.id === user.id,
    );
    if (isSelected) return false;

    if (!searchQuery.trim()) return true;

    return user.username.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const handleUserSelect = (user: User) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearchQuery("");
  };

  const handleUserRemove = (userId: number) => {
    setSelectedUsers(selectedUsers.filter((user) => user.id !== userId));
  };

  const handleCreateChat = () => {
    if (selectedUsers.length === 0) return;

    setIsCreating(true);

    createChatMutation.mutate(
      {
        userId: currentUser.id,
        participantIds: selectedUsers.map((user) => user.id),
        name: chatName,
      },
      {
        onSettled: () => {
          setIsCreating(false);
          setSelectedUsers([]);
          setChatName("");
        },
      },
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Chat</DialogTitle>
          <DialogDescription>
            Search for users to add to your chat.
          </DialogDescription>
        </DialogHeader>

        <h4 className="text-sm font-medium">Chat Name</h4>

        <Input
          value={chatName}
          onChange={(e) => setChatName(e.target.value)}
          placeholder="Enter chat name (optional)"
        />
        <h4 className="text-sm font-medium">Participants</h4>

        <div className="flex flex-col gap-4">
          {selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-accent flex items-center gap-1 rounded-full px-3 py-1 text-sm"
                >
                  <span>{user.username}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 rounded-full"
                    onClick={() => handleUserRemove(user.id)}
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="relative">
            <SearchIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="pl-9"
            />
          </div>

          <div className="max-h-52 overflow-y-auto">
            {filteredUsers.length > 0 ? (
              <div className="flex flex-col">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    className="hover:bg-accent flex items-center gap-2 rounded-md p-2"
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-full">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <span>{user.username}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground p-4 text-center">
                {searchQuery ? "No users found" : "Select users to chat with"}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={selectedUsers.length === 0 || isCreating}
            onClick={handleCreateChat}
          >
            {isCreating ? "Creating..." : "Create Chat"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
