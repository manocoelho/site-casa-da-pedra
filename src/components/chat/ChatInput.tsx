"use client";

import { useState, type KeyboardEvent } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { SendIcon } from "@/components/ui/icons";

interface ChatInputProps {
  onSendMessage: (content: string) => Promise<boolean>;
  isSending: boolean;
  disabled?: boolean;
  className?: string;
}

export function ChatInput({
  onSendMessage,
  isSending,
  disabled = false,
  className = "",
}: ChatInputProps) {
  const [content, setContent] = useState("");

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed || isSending || disabled) return;

    const ok = await onSendMessage(trimmed);
    if (ok) {
      setContent("");
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const canSend = Boolean(content.trim()) && !isSending && !disabled;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleSend();
      }}
      className={`flex items-end gap-2 border-t border-stone-200 bg-white p-3 dark:border-stone-800 dark:bg-stone-900 ${className}`}
    >
      <div className="relative flex-1">
        <textarea
          rows={1}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isSending}
          placeholder="Digite sua mensagem... (Enter para enviar)"
          maxLength={5000}
          className="max-h-32 min-h-11 w-full resize-none rounded-2xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:bg-white focus:outline-hidden dark:border-stone-700 dark:bg-stone-950 dark:text-stone-100 dark:placeholder:text-stone-500"
        />
      </div>

      <button
        type="submit"
        disabled={!canSend}
        aria-label="Enviar mensagem"
        className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white transition hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
      >
        {isSending ? (
          <Spinner className="size-4" />
        ) : (
          <SendIcon className="size-4.5" />
        )}
      </button>
    </form>
  );
}
