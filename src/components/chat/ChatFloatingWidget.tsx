"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useChatNotifications } from "@/context/ChatNotificationContext";
import { getBrowserMessagesService } from "@/services/messages";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ChatIcon, ExternalLinkIcon } from "@/components/ui/icons";
import { ROUTES } from "@/lib/routes";
import type { UserProfile } from "@/types/entities";

export function ChatFloatingWidget() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isAdmin } = useAuthUser();
  const { unreadCount, markConversationAsRead } = useChatNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [adminContact, setAdminContact] = useState<UserProfile | null>(null);

  // Não exibe o widget flutuante dentro da página dedicada de chat
  const isChatPage = pathname === "/chat";

  useEffect(() => {
    if (!isAuthenticated || isAdmin) return;

    let isMounted = true;
    getBrowserMessagesService()
      .getAdminContact()
      .then((contact) => {
        if (isMounted) setAdminContact(contact);
      })
      .catch((err) => console.warn("[ChatFloatingWidget] Erro ao buscar admin:", err));

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, isAdmin]);

  // Se o cliente abriu a janelinha do anfitrião, marca mensagens como lidas
  useEffect(() => {
    if (isOpen && adminContact?.id) {
      markConversationAsRead(adminContact.id);
    }
  }, [isOpen, adminContact, markConversationAsRead]);

  function handleButtonClick() {
    if (isAdmin) {
      router.push(ROUTES.chat);
      return;
    }
    setIsOpen((prev) => !prev);
  }

  if (isChatPage) return null;

  return (
    <div className="fixed right-5 bottom-5 z-40 flex flex-col items-end">
      {/* Janela compacta do widget quando aberta */}
      {isOpen && (
        <div className="mb-3 flex h-[480px] w-[350px] sm:w-[380px] flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl transition-all duration-200 dark:border-stone-800 dark:bg-stone-900">
          {/* Header do Widget */}
          <div className="flex h-14 items-center justify-between border-b border-stone-200 bg-amber-500 px-4 text-stone-950 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <span className="flex size-2.5 rounded-full bg-emerald-700 animate-pulse" />
              <span className="font-bold text-sm">Falar com o Anfitrião</span>
            </div>

            <div className="flex items-center gap-1">
              <Link
                href="/chat"
                aria-label="Abrir chat em tela cheia"
                className="rounded-lg p-1 text-stone-900 transition hover:bg-black/10"
                title="Expandir para tela cheia"
              >
                <ExternalLinkIcon className="size-4" />
              </Link>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar janela de chat"
                className="rounded-lg px-2 py-0.5 font-bold text-sm text-stone-900 transition hover:bg-black/10"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Conteúdo do Widget */}
          {!isAuthenticated ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                <ChatIcon className="size-6" />
              </div>
              <h4 className="mt-3 text-sm font-bold text-stone-900 dark:text-stone-100">
                Converse com a Casa da Pedra
              </h4>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                Entre na sua conta para enviar mensagens em tempo real e tirar dúvidas sobre sua estadia.
              </p>
              <Link
                href={`${ROUTES.login}?next=${encodeURIComponent(pathname)}`}
                className="mt-4 inline-flex h-9 items-center justify-center rounded-xl bg-stone-900 px-4 text-xs font-semibold text-white shadow-xs transition hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
              >
                Entrar para conversar
              </Link>
            </div>
          ) : user && adminContact ? (
            <ChatWindow
              userId={user.id}
              receiverId={adminContact.id}
              interlocutorName={adminContact.nome || "Anfitrião Casa da Pedra"}
              interlocutorRole="admin"
              className="flex-1"
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-xs text-stone-500">
              <p>Carregando canal com o anfitrião...</p>
            </div>
          )}
        </div>
      )}

      {/* Botão flutuante de acionamento */}
      <button
        type="button"
        onClick={handleButtonClick}
        aria-label={isAdmin ? "Ir para o chat de mensagens" : isOpen ? "Fechar chat" : "Abrir chat"}
        className="group relative flex size-14 items-center justify-center rounded-full bg-stone-900 text-white shadow-xl transition-transform hover:scale-105 active:scale-95 dark:bg-amber-500 dark:text-stone-950"
      >
        <span className="relative">
          <ChatIcon className="size-6" />
          {unreadCount > 0 ? (
            <span className="absolute -top-3 -right-3 flex min-w-5 h-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-black text-white shadow-lg animate-bounce">
              {unreadCount}
            </span>
          ) : (
            !isOpen && (
              <span className="absolute -top-1 -right-1 size-3 rounded-full border-2 border-stone-900 bg-amber-400 dark:border-amber-500 dark:bg-stone-900" />
            )
          )}
        </span>
      </button>
    </div>
  );
}
