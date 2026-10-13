"use client";

import { useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Spinner } from "@/components/ui/Spinner";
import { ChatIcon } from "@/components/ui/icons";
import type { ChatMessage } from "@/types/chat";

interface ChatMessageListProps {
  messages: ChatMessage[];
  currentUserId: string;
  interlocutorName: string;
  isLoading?: boolean;
  className?: string;
}

export function ChatMessageList({
  messages,
  currentUserId,
  interlocutorName,
  isLoading = false,
  className = "",
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll sempre que novas mensagens chegarem
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function formatMessageTime(isoString: string): string {
    try {
      return format(parseISO(isoString), "HH:mm", { locale: ptBR });
    } catch {
      return "";
    }
  }

  if (isLoading) {
    return (
      <div className={`flex flex-1 flex-col items-center justify-center p-8 text-stone-500 ${className}`}>
        <Spinner className="size-6 text-amber-500" />
        <span className="mt-2 text-xs">Carregando mensagens...</span>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={`flex flex-1 flex-col items-center justify-center p-8 text-center ${className}`}>
        <div className="flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          <ChatIcon className="size-7" />
        </div>
        <h4 className="mt-3 text-sm font-bold text-stone-900 dark:text-stone-100">
          Inicie sua conversa com {interlocutorName}
        </h4>
        <p className="mt-1 max-w-xs text-xs text-stone-500 dark:text-stone-400">
          Tire dúvidas sobre reservas, horários de check-in, localização e dicas de Bananeiras.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/60 dark:bg-stone-950/40 ${className}`}
    >
      {messages.map((msg) => {
        const isMine = msg.sender_id === currentUserId;

        return (
          <div
            key={msg.id}
            className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[78%] sm:max-w-[65%] px-4 py-2.5 shadow-2xs break-words text-sm ${
                isMine
                  ? "bg-amber-600 text-white rounded-2xl rounded-tr-xs dark:bg-amber-500 dark:text-stone-950"
                  : "bg-white text-stone-900 border border-stone-200/80 rounded-2xl rounded-tl-xs dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.conteudo}</p>
              <div
                className={`mt-1 flex justify-end text-[10px] ${
                  isMine
                    ? "text-amber-100/90 dark:text-stone-950/70"
                    : "text-stone-400 dark:text-stone-500"
                }`}
              >
                {formatMessageTime(msg.timestamp)}
              </div>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
