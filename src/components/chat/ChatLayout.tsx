"use client";

import { useEffect, useState } from "react";
import { getBrowserMessagesService } from "@/services/messages";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatIcon } from "@/components/ui/icons";
import type { ChatConversation } from "@/types/chat";
import type { UserProfile } from "@/types/entities";

interface ChatLayoutProps {
  currentUser: UserProfile;
  initialConversations: ChatConversation[];
  adminContact: UserProfile | null;
  targetInterlocutorId?: string;
}

export function ChatLayout({
  currentUser,
  initialConversations,
  adminContact,
  targetInterlocutorId,
}: ChatLayoutProps) {
  const [conversations, setConversations] = useState<ChatConversation[]>(initialConversations);
  const isAdmin = currentUser.role === "admin";

  // Determina o interlocutor inicial selecionado
  const defaultSelectedId =
    targetInterlocutorId ||
    initialConversations[0]?.interlocutorId ||
    (!isAdmin && adminContact ? adminContact.id : undefined);

  const [activeInterlocutorId, setActiveInterlocutorId] = useState<string | undefined>(
    defaultSelectedId,
  );

  // Recarrega lista de conversas
  useEffect(() => {
    let isMounted = true;
    getBrowserMessagesService()
      .listConversations(currentUser.id)
      .then((list) => {
        if (isMounted) setConversations(list);
      })
      .catch((err) => console.error("[ChatLayout] Erro ao listar conversas:", err));

    return () => {
      isMounted = false;
    };
  }, [currentUser.id]);

  // Busca dados do interlocutor ativo
  const activeConversation = conversations.find(
    (c) => c.interlocutorId === activeInterlocutorId,
  );

  const interlocutorName =
    activeConversation?.interlocutorNome ||
    (activeInterlocutorId === adminContact?.id ? adminContact?.nome || "Anfitrião Casa da Pedra" : "Contato");

  const interlocutorRole =
    activeConversation?.interlocutorRole ||
    (activeInterlocutorId === adminContact?.id ? "admin" : "client");

  return (
    <div className="flex h-[calc(100vh-8rem)] w-full overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl dark:border-stone-800 dark:bg-stone-900">
      {/* Sidebar: Oculta em mobile quando há uma conversa ativa */}
      <ChatSidebar
        conversations={conversations}
        activeInterlocutorId={activeInterlocutorId}
        onSelectConversation={(id) => setActiveInterlocutorId(id)}
        adminContact={adminContact}
        isAdmin={isAdmin}
        className={`w-full md:w-80 md:flex ${
          activeInterlocutorId ? "hidden md:flex" : "flex"
        }`}
      />

      {/* Janela Principal de Mensagens */}
      {activeInterlocutorId ? (
        <ChatWindow
          userId={currentUser.id}
          receiverId={activeInterlocutorId}
          interlocutorName={interlocutorName}
          interlocutorRole={interlocutorRole}
          onBack={() => setActiveInterlocutorId(undefined)}
          className={`flex-1 ${activeInterlocutorId ? "flex" : "hidden md:flex"}`}
        />
      ) : (
        <div className="hidden flex-1 flex-col items-center justify-center p-8 text-center md:flex bg-stone-50/50 dark:bg-stone-950/40">
          <div className="flex size-16 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <ChatIcon className="size-8" />
          </div>
          <h3 className="mt-4 text-base font-bold text-stone-900 dark:text-stone-50">
            Casa da Pedra Chat
          </h3>
          <p className="mt-1 max-w-sm text-xs text-stone-500 dark:text-stone-400">
            Selecione uma conversa ao lado para começar a enviar e receber mensagens em tempo real.
          </p>
        </div>
      )}
    </div>
  );
}
