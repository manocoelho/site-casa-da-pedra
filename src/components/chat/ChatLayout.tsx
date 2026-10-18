"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getBrowserMessagesService } from "@/services/messages";
import { useChatNotifications } from "@/context/ChatNotificationContext";
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

const CLOSED_CHATS_STORAGE_KEY = "cp_admin_closed_conversations";

function readClosedMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CLOSED_CHATS_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

function saveClosedMap(map: Record<string, string>) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CLOSED_CHATS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignora erro de localStorage
  }
}

export function ChatLayout({
  currentUser,
  initialConversations,
  adminContact,
  targetInterlocutorId,
}: ChatLayoutProps) {
  const { setActiveConversationId, markConversationAsRead } = useChatNotifications();
  const [conversations, setConversations] = useState<ChatConversation[]>(initialConversations);
  const [closedTimestamps, setClosedTimestamps] = useState<Record<string, string>>({});
  const [deletingInterlocutorId, setDeletingInterlocutorId] = useState<string | null>(null);
  const isAdmin = currentUser.role === "admin";

  // Carrega mapa local de conversas encerradas (garante ocultação imediata até que chegue mensagem nova)
  useEffect(() => {
    setClosedTimestamps(readClosedMap());
  }, []);

  // Filtra conversas encerradas caso ainda não tenham recebido uma mensagem posterior ao encerramento
  const visibleConversations = useMemo(() => {
    if (!isAdmin) return conversations;
    return conversations.filter((conv) => {
      const closedAt = closedTimestamps[conv.interlocutorId];
      if (!closedAt) return true;
      if (!conv.ultimoTimestamp) return false;
      return new Date(conv.ultimoTimestamp).getTime() > new Date(closedAt).getTime();
    });
  }, [conversations, closedTimestamps, isAdmin]);

  // Determina o interlocutor inicial selecionado
  const defaultSelectedId =
    targetInterlocutorId ||
    initialConversations[0]?.interlocutorId ||
    (!isAdmin && adminContact ? adminContact.id : undefined);

  const [activeInterlocutorId, setActiveInterlocutorId] = useState<string | undefined>(
    defaultSelectedId,
  );

  // Sincroniza conversa ativa com o contexto de notificações e marca como lida
  useEffect(() => {
    setActiveConversationId(activeInterlocutorId || null);
    if (activeInterlocutorId) {
      markConversationAsRead(activeInterlocutorId);
    }
    return () => {
      setActiveConversationId(null);
    };
  }, [activeInterlocutorId, setActiveConversationId, markConversationAsRead]);

  // Recarrega lista de conversas inicialmente e sempre que houver novas mensagens ou exclusões via Realtime
  useEffect(() => {
    let isMounted = true;
    const messagesService = getBrowserMessagesService();

    function refresh() {
      messagesService
        .listConversations(currentUser.id)
        .then((list) => {
          if (isMounted) setConversations(list);
        })
        .catch((err) => console.error("[ChatLayout] Erro ao listar conversas:", err));
    }

    refresh();

    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`chat-sidebar-sync:${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          refresh();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [currentUser.id]);

  // Encerrar / excluir conversa (para administradores)
  const handleDeleteConversation = useCallback(
    async (interlocutorId: string, interlocutorName: string) => {
      if (!isAdmin || !interlocutorId) return;

      const confirmed = window.confirm(
        `Deseja encerrar e excluir a conversa com "${interlocutorName}"? Ela será removida da sua lista de atendimentos.`,
      );
      if (!confirmed) return;

      setDeletingInterlocutorId(interlocutorId);
      try {
        const messagesService = getBrowserMessagesService();
        await messagesService.deleteConversation(interlocutorId);

        // Registra o timestamp de encerramento para ocultar imediatamente
        const nowIso = new Date().toISOString();
        setClosedTimestamps((prev) => {
          const next = { ...prev, [interlocutorId]: nowIso };
          saveClosedMap(next);
          return next;
        });

        markConversationAsRead(interlocutorId);

        setConversations((prev) =>
          prev.filter((c) => c.interlocutorId !== interlocutorId),
        );

        if (activeInterlocutorId === interlocutorId) {
          const remaining = visibleConversations.filter(
            (c) => c.interlocutorId !== interlocutorId,
          );
          setActiveInterlocutorId(remaining[0]?.interlocutorId);
        }
      } finally {
        setDeletingInterlocutorId(null);
      }
    },
    [isAdmin, activeInterlocutorId, visibleConversations, markConversationAsRead],
  );

  // Busca dados do interlocutor ativo
  const activeConversation = visibleConversations.find(
    (c) => c.interlocutorId === activeInterlocutorId,
  );

  const interlocutorName =
    activeConversation?.interlocutorNome ||
    (activeInterlocutorId === adminContact?.id ? adminContact?.nome || "Anfitrião Casa da Pedra" : "Contato");

  const interlocutorRole: "admin" | "client" =
    activeConversation?.interlocutorRole || (isAdmin ? "client" : "admin");

  return (
    <div className="flex h-[calc(100vh-8rem)] w-full overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl dark:border-stone-800 dark:bg-stone-900">
      {/* Sidebar: Oculta em mobile quando há uma conversa ativa */}
      <ChatSidebar
        conversations={visibleConversations}
        activeInterlocutorId={activeInterlocutorId}
        onSelectConversation={(id) => setActiveInterlocutorId(id)}
        onDeleteConversation={isAdmin ? handleDeleteConversation : undefined}
        deletingInterlocutorId={deletingInterlocutorId}
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
          isAdmin={isAdmin}
          onDeleteConversation={
            isAdmin
              ? () => handleDeleteConversation(activeInterlocutorId, interlocutorName)
              : undefined
          }
          isDeletingConversation={deletingInterlocutorId === activeInterlocutorId}
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
