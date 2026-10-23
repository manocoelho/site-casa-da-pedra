"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getBrowserMessagesService } from "@/services/messages";
import type { ChatMessage } from "@/types/chat";

export function useChat(
  userId: string,
  receiverId?: string,
  interlocutorRole?: "admin" | "client",
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(Boolean(userId && receiverId));
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Carrega histórico e subscreve no canal WebSocket do Realtime
  useEffect(() => {
    if (!userId || !receiverId) return;

    let isMounted = true;
    const supabase = createSupabaseBrowserClient();
    const messagesService = getBrowserMessagesService();

    // 1. Carrega histórico unificado de mensagens da conversa
    messagesService
      .listConversation(userId, receiverId)
      .then((history) => {
        if (isMounted) {
          setMessages(history);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("[useChat] Erro ao carregar mensagens:", err);
        if (isMounted) {
          setError("Não foi possível carregar o histórico da conversa.");
          setIsLoading(false);
        }
      });

    // 2. Inscreve no canal Supabase Realtime para receber novas mensagens instantaneamente
    const handleIncomingMessage = (newMsg: ChatMessage) => {
      if (!newMsg || !newMsg.id) return;

      // Determina o ID do cliente da conversa (ponto de convergência da thread)
      const targetClientId =
        interlocutorRole === "client"
          ? receiverId
          : interlocutorRole === "admin"
            ? userId
            : null;

      // Qualquer mensagem de/para o hóspede pertence a esta conversa unificada
      const belongsToConversation = targetClientId
        ? newMsg.sender_id === targetClientId || newMsg.receiver_id === targetClientId
        : (newMsg.sender_id === userId && newMsg.receiver_id === receiverId) ||
          (newMsg.sender_id === receiverId && newMsg.receiver_id === userId);

      if (belongsToConversation && isMounted) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) {
            return prev;
          }
          return [...prev, newMsg];
        });
      }
    };

    const baseChannel = supabase.channel("chat-messages-broadcast");
    const channel = (
      baseChannel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          if (payload.eventType === "INSERT" && payload.new) {
            handleIncomingMessage(payload.new as ChatMessage);
          } else if (payload.eventType === "DELETE" && payload.old) {
            const deletedId = (payload.old as { id?: string })?.id;
            if (deletedId && isMounted) {
              setMessages((prev) => prev.filter((m) => m.id !== deletedId));
            }
          }
        },
      ) as unknown as {
        on: (
          type: "broadcast",
          filter: { event: string },
          callback: (payload: { payload?: ChatMessage }) => void,
        ) => typeof baseChannel;
      }
    )
      .on("broadcast", { event: "new_message" }, (payload) => {
        if (payload?.payload) {
          handleIncomingMessage(payload.payload);
        }
      })
      .subscribe();

    // Sincronização leve a cada 4s para garantir que múltiplos admins trabalhando juntos vejam tudo em tempo real
    const syncTimer = window.setInterval(() => {
      messagesService
        .listConversation(userId, receiverId)
        .then((fresh) => {
          if (isMounted) {
            setMessages(fresh);
          }
        })
        .catch(() => null);
    }, 4000);

    // 3. Cleanup: desinscreve e remove o canal ao desmontar ou trocar de interlocutor
    return () => {
      isMounted = false;
      window.clearInterval(syncTimer);
      supabase.removeChannel(channel);
    };
  }, [userId, receiverId, interlocutorRole]);

  // Função para envio de mensagem
  const sendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      const trimmed = content.trim();
      if (!trimmed || !userId || !receiverId || isSending) {
        return false;
      }

      setError(null);
      setIsSending(true);

      try {
        const messagesService = getBrowserMessagesService();
        const result = await messagesService.sendMessage(userId, receiverId, trimmed);

        if (!result.ok || !result.data) {
          setError(result.error || "Erro ao enviar mensagem.");
          setIsSending(false);
          return false;
        }

        // Adiciona a mensagem localmente caso o evento Realtime ainda não tenha chegado
        const sentMessage = result.data;
        setMessages((prev) => {
          if (prev.some((m) => m.id === sentMessage.id)) {
            return prev;
          }
          return [...prev, sentMessage];
        });

        // Notifica todos os outros admins e o cliente conectados em tempo real
        try {
          const supabase = createSupabaseBrowserClient();
          const bChannel = supabase.channel("chat-messages-broadcast");
          bChannel.subscribe((status) => {
            if (status === "SUBSCRIBED") {
              bChannel
                .send({
                  type: "broadcast",
                  event: "new_message",
                  payload: sentMessage,
                })
                .finally(() => {
                  supabase.removeChannel(bChannel);
                });
            }
          });
        } catch {
          // Ignora falha de broadcast opcional
        }

        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro inesperado ao enviar mensagem.";
        setError(msg);
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [userId, receiverId, isSending],
  );

  return {
    messages,
    isLoading,
    isSending,
    error,
    sendMessage,
  };
}
