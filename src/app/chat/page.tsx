import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createUsersService } from "@/services/users";
import { createMessagesService } from "@/services/messages";
import { ChatLayout } from "@/components/chat/ChatLayout";
import { ROUTES } from "@/lib/routes";

export const instant = false;

export const metadata: Metadata = {
  title: "Chat em Tempo Real | Casa da Pedra",
  description: "Converse diretamente com o anfitrião ou hóspedes da Casa da Pedra em Bananeiras",
};

interface ChatPageProps {
  searchParams: Promise<{ with?: string }>;
}

export default async function ChatPage({ searchParams }: ChatPageProps) {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    redirect(`${ROUTES.login}?next=${encodeURIComponent("/chat")}`);
  }

  const { with: targetInterlocutorId } = await searchParams;

  const usersService = createUsersService(supabase);
  const messagesService = createMessagesService(supabase);

  const [profile, adminContact, initialConversations] = await Promise.all([
    usersService.getProfileById(userData.user.id),
    messagesService.getAdminContact(),
    messagesService.listConversations(userData.user.id),
  ]);

  const currentUser = profile || {
    id: userData.user.id,
    nome: userData.user.user_metadata?.nome || "Hóspede",
    email: userData.user.email || "",
    role: "client" as const,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <ChatLayout
        currentUser={currentUser}
        initialConversations={initialConversations}
        adminContact={adminContact}
        targetInterlocutorId={targetInterlocutorId}
      />
    </div>
  );
}
