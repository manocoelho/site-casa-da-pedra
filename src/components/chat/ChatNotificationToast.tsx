"use client";

import Link from "next/link";
import { ChatIcon } from "@/components/ui/icons";

export interface ChatToastData {
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
}

interface ChatNotificationToastProps {
  toast: ChatToastData | null;
  onDismiss: () => void;
}

export function ChatNotificationToast({
  toast,
  onDismiss,
}: ChatNotificationToastProps) {
  if (!toast) return null;

  const preview =
    toast.content.length > 70
      ? `${toast.content.slice(0, 70)}...`
      : toast.content;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-20 right-4 z-50 flex max-w-sm w-full animate-bounce-short flex-col rounded-2xl border border-amber-200 bg-white p-4 shadow-2xl transition dark:border-amber-900/60 dark:bg-stone-900 sm:right-6"
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-stone-950 font-bold shadow-xs">
          <ChatIcon className="size-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-bold text-stone-900 dark:text-stone-100">
              {toast.senderName}
            </p>
            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
              Nova mensagem
            </span>
          </div>

          <p className="mt-1 text-xs text-stone-600 line-clamp-2 dark:text-stone-300">
            {preview}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <Link
              href={`/chat?with=${toast.senderId}`}
              onClick={onDismiss}
              className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-stone-950 transition hover:bg-amber-400"
            >
              Responder
            </Link>
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            >
              Dispensar
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Fechar notificação"
          className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
