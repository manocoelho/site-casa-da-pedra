"use client";

import Link from "next/link";
import Image from "next/image";
import { ChatIcon, ExternalLinkIcon, ShieldIcon } from "@/components/ui/icons";
import { useChatNotifications } from "@/context/ChatNotificationContext";
import { ROUTES } from "@/lib/routes";

interface AdminHeaderProps {
  userEmail?: string;
  userName?: string;
}

export function AdminHeader({ userEmail, userName }: AdminHeaderProps) {
  const { unreadCount } = useChatNotifications();
  const displayName = userName || userEmail || "Administrador";

  return (
    <header className="border-b border-stone-200 bg-white shadow-2xs dark:border-stone-800 dark:bg-stone-900">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.home}
            className="flex items-center gap-2 transition hover:opacity-90"
            aria-label="Casa da Pedra - Início"
          >
            <Image
              src="/images/logo-casa-da-pedra-light.png"
              alt="Casa da Pedra"
              width={140}
              height={34}
              className="h-8 w-auto object-contain dark:hidden"
              priority
            />
            <Image
              src="/images/logo-casa-da-pedra.png"
              alt="Casa da Pedra"
              width={140}
              height={34}
              className="hidden h-8 w-auto object-contain dark:block"
              priority
            />
          </Link>
          <span className="text-stone-300 dark:text-stone-700">/</span>
          <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
            <ShieldIcon className="size-3.5" />
            Painel Admin
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-stone-500 sm:inline dark:text-stone-400">
            Logado como <strong className="text-stone-700 dark:text-stone-200">{displayName}</strong>
          </span>

          <Link
            href={ROUTES.chat}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            <ChatIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
            <span>Chat</span>
            {unreadCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-extrabold text-stone-950 shadow-2xs animate-pulse">
                {unreadCount}
              </span>
            )}
          </Link>

          <Link
            href={ROUTES.home}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            <ExternalLinkIcon className="size-3.5" />
            Ver site público
          </Link>
        </div>
      </div>
    </header>
  );
}
