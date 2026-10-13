"use client";

import { Alert } from "@/components/ui/Alert";
import { ChevronLeftIcon, ShieldIcon } from "@/components/ui/icons";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { useChat } from "@/hooks/useChat";

interface ChatWindowProps {
  userId: string;
  receiverId?: string;
  interlocutorName: string;
  interlocutorRole?: "admin" | "client";
  onBack?: () => void;
  className?: string;
}

export function ChatWindow({
  userId,
  receiverId,
  interlocutorName,
  interlocutorRole,
  onBack,
  className = "",
}: ChatWindowProps) {
  // O componente consome estritamente o hook useChat (SRP)
  const { messages, isLoading, isSending, error, sendMessage } = useChat(
    userId,
    receiverId,
  );

  const initial = interlocutorName.charAt(0).toUpperCase() || "?";

  return (
    <div
      className={`flex flex-1 flex-col overflow-hidden bg-white dark:bg-stone-900 ${className}`}
    >
      {/* Top Bar da conversa */}
      <div className="flex h-16 items-center justify-between border-b border-stone-200 px-4 dark:border-stone-800">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Voltar para a lista de conversas"
              className="mr-1 rounded-lg p-1 text-stone-500 hover:bg-stone-100 md:hidden dark:text-stone-400 dark:hover:bg-stone-800"
            >
              <ChevronLeftIcon className="size-5" />
            </button>
          )}

          <div
            className={`flex size-10 shrink-0 items-center justify-center rounded-full font-bold text-sm ${
              interlocutorRole === "admin"
                ? "bg-amber-500 text-stone-950"
                : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
            }`}
          >
            {initial}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                {interlocutorName}
              </h3>
              {interlocutorRole === "admin" && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-semibold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                  <ShieldIcon className="size-2.5" />
                  Dono
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Em tempo real</span>
            </div>
          </div>
        </div>
      </div>

      {/* Alerta de erro */}
      {error && (
        <div className="p-2">
          <Alert variant="error">{error}</Alert>
        </div>
      )}

      {/* Lista de Mensagens */}
      <ChatMessageList
        messages={messages}
        currentUserId={userId}
        interlocutorName={interlocutorName}
        isLoading={isLoading}
      />

      {/* Barra de Digitação e Envio */}
      <ChatInput
        onSendMessage={sendMessage}
        isSending={isSending}
        disabled={!receiverId}
      />
    </div>
  );
}
