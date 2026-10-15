"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { initAudioUnlock, playNotificationSound } from "@/lib/sound";
import { getBrowserMessagesService } from "@/services/messages";
import {
  ChatNotificationToast,
  type ChatToastData,
} from "@/components/chat/ChatNotificationToast";
import type { ChatMessage } from "@/types/chat";

interface ChatNotificationContextType {
  unreadCount: number;
  unreadBySender: Record<string, number>;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  markConversationAsRead: (senderId: string) => void;
}

const ChatNotificationContext = createContext<ChatNotificationContextType>({
  unreadCount: 0,
  unreadBySender: {},
  activeConversationId: null,
  setActiveConversationId: () => {},
  markConversationAsRead: () => {},
});

const STORAGE_PREFIX = "cp_chat_last_read";

function getReadTimestampKey(userId: string, senderId: string): string {
  return `${STORAGE_PREFIX}_${userId}_${senderId}`;
}

export function ChatNotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin } = useAuthUser();
  const [unreadBySender, setUnreadBySender] = useState<Record<string, number>>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [toast, setToast] = useState<ChatToastData | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeConversationRef = useRef<string | null>(null);

  useEffect(() => {
    initAudioUnlock();
  }, []);

  // Mantém a ref sincronizada para leitura síncrona dentro do listener do WebSocket
  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  const markConversationAsRead = useCallback(
    (senderId: string) => {
      if (!user || !senderId) return;

      const now = new Date().toISOString();
      try {
        localStorage.setItem(getReadTimestampKey(user.id, senderId), now);
      } catch {
        // Ignora erros de localStorage desabilitado
      }

      setUnreadBySender((prev) => {
        if (!prev[senderId]) return prev;
        const updated = { ...prev };
        delete updated[senderId];
        return updated;
      });

      // Se a notificação flutuante era deste remetente, fecha
      setToast((current) => (current?.senderId === senderId ? null : current));
    },
    [user],
  );

  // 1. Carregamento inicial das mensagens não lidas
  useEffect(() => {
    let isMounted = true;

    if (!user) {
      queueMicrotask(() => {
        if (isMounted) setUnreadBySender({});
      });
      return;
    }
    const supabase = createSupabaseBrowserClient();
    const messagesService = getBrowserMessagesService();

    async function loadUnreadMessages() {
      if (!user) return;
      try {
        let data: { id: string; sender_id: string; timestamp: string }[] | null = null;

        if (isAdmin) {
          // Para administradores: busca mensagens enviadas por hóspedes (sender_id não é admin)
          const adminIds = await messagesService.getAdminIds();
          let query = supabase
            .from("messages")
            .select("id, sender_id, timestamp")
            .order("timestamp", { ascending: false })
            .limit(200);

          if (adminIds.length > 0) {
            query = query.not("sender_id", "in", `(${adminIds.join(",")})`);
          }

          const res = await query;
          data = res.data;
        } else {
          // Para clientes/hóspedes: busca mensagens recebidas pelo próprio usuário
          const res = await supabase
            .from("messages")
            .select("id, sender_id, timestamp")
            .eq("receiver_id", user.id)
            .order("timestamp", { ascending: false })
            .limit(100);

          data = res.data;
        }

        if (!data || !isMounted) return;

        const counts: Record<string, number> = {};
        for (const msg of data) {
          const lastReadIso = localStorage.getItem(
            getReadTimestampKey(user.id, msg.sender_id),
          );

          const isUnread = !lastReadIso || new Date(msg.timestamp) > new Date(lastReadIso);
          if (isUnread) {
            counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
          }
        }

        if (isMounted) {
          setUnreadBySender(counts);
        }
      } catch (err) {
        console.warn("[ChatNotification] Falha ao carregar status de leitura:", err);
      }
    }

    loadUnreadMessages();

    return () => {
      isMounted = false;
    };
  }, [user, isAdmin]);

  // 2. Inscrição Realtime no canal para novos alertas (todos os admins recebem alertas de clientes)
  useEffect(() => {
    if (!user) return;

    const supabase = createSupabaseBrowserClient();
    const messagesService = getBrowserMessagesService();
    const channelName = `notifications:user:${user.id}:${isAdmin ? "admin" : "client"}`;

    let adminIdSet = new Set<string>();
    if (isAdmin) {
      messagesService.getAdminIds().then((ids) => {
        adminIdSet = new Set(ids);
      });
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          ...(isAdmin ? {} : { filter: `receiver_id=eq.${user.id}` }),
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          const senderId = newMsg.sender_id;

          // Se a mensagem foi enviada pelo próprio usuário logado, ignora
          if (senderId === user.id) return;

          // Se o usuário atual for admin e a mensagem foi enviada por outro admin, ignora
          if (isAdmin) {
            if (adminIdSet.has(senderId)) return;
            if (adminIdSet.size === 0) {
              const ids = await messagesService.getAdminIds();
              adminIdSet = new Set(ids);
              if (adminIdSet.has(senderId)) return;
            }
          }

          // Se o usuário está com o chat aberto exatamente nessa conversa, marca como lida imediatamente
          if (activeConversationRef.current === senderId) {
            markConversationAsRead(senderId);
            return;
          }

          // Atualiza o contador de não lidas
          setUnreadBySender((prev) => ({
            ...prev,
            [senderId]: (prev[senderId] || 0) + 1,
          }));

          // Toca som de alerta agradável
          playNotificationSound();

          // Busca nome do remetente para exibir no toast
          let senderName = isAdmin ? "Novo Hóspede" : "Casa da Pedra";
          try {
            const { data } = await supabase
              .from("users")
              .select("nome")
              .eq("id", senderId)
              .maybeSingle();

            if (data?.nome) senderName = data.nome;
          } catch {
            // Mantém fallback
          }

          // Exibe o toast visual
          if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
          setToast({
            senderId,
            senderName,
            content: newMsg.conteudo,
            timestamp: newMsg.timestamp,
          });

          // Fecha automaticamente após 7 segundos
          toastTimeoutRef.current = setTimeout(() => {
            setToast(null);
          }, 7000);
        },
      )
      .subscribe();

    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin, markConversationAsRead]);

  // Contagem total
  const unreadCount = useMemo(() => {
    return Object.values(unreadBySender).reduce((sum, count) => sum + count, 0);
  }, [unreadBySender]);

  // Sincroniza o título da aba do navegador para chamar a atenção
  useEffect(() => {
    if (typeof document === "undefined") return;
    const baseTitle = "Casa da Pedra";

    if (unreadCount > 0) {
      document.title = `(${unreadCount}) Nova mensagem | ${baseTitle}`;
    } else {
      // Se não houver mensagens não lidas e tiver o contador no título, reseta
      if (document.title.startsWith("(")) {
        document.title = baseTitle;
      }
    }
  }, [unreadCount]);

  return (
    <ChatNotificationContext.Provider
      value={{
        unreadCount,
        unreadBySender,
        activeConversationId,
        setActiveConversationId,
        markConversationAsRead,
      }}
    >
      {children}
      <ChatNotificationToast toast={toast} onDismiss={() => setToast(null)} />
    </ChatNotificationContext.Provider>
  );
}

export function useChatNotifications() {
  return useContext(ChatNotificationContext);
}
