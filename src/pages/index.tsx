import { ChatSidebar } from "~/components/chat-sidebar";
import { ChatContent } from "~/components/chat-content";
import { useAuthStore } from "~/store/auth-store";
import { LoginForm } from "~/components/login-form";
import useChatStore from "~/store/chat-store";

export default function Page() {
  const { currentUser } = useAuthStore();
  const { selectedChat } = useChatStore();
  if (!currentUser) {
    return <LoginForm />;
  }

  return (
    <div className="flex h-[calc(100vh-5.3rem)] w-full">
      <ChatSidebar currentUser={currentUser} />
      <div className="grow px-8">
        {selectedChat && (
          <ChatContent currentUser={currentUser} selectedChat={selectedChat} />
        )}
      </div>
    </div>
  );
}
