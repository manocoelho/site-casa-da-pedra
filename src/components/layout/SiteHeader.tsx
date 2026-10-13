"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useChatNotifications } from "@/context/ChatNotificationContext";
import { ROUTES } from "@/lib/routes";

export function SiteHeader() {
  const { profile, user, isLoading, isAuthenticated, isAdmin, signOut } = useAuthUser();
  const { unreadCount } = useChatNotifications();
  const displayName = profile?.nome ?? user?.email ?? "";

  return (
    <header className="border-b border-stone-200 bg-white/80 backdrop-blur dark:border-stone-800 dark:bg-stone-950/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={ROUTES.home} className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          Casa da Pedra
        </Link>

        <nav className="flex items-center gap-2" aria-label="Conta">
          {isLoading ? (
            <span className="h-9 w-32 animate-pulse rounded-lg bg-stone-100 dark:bg-stone-800" />
          ) : isAuthenticated ? (
            <>
              <span className="hidden text-sm text-stone-600 sm:inline dark:text-stone-300">
                Olá, <strong className="font-medium">{displayName}</strong>
              </span>
              <Link
                href={ROUTES.chat}
                className="relative inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                <span>Chat</span>
                {unreadCount > 0 && (
                  <span className="flex items-center gap-1 rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-extrabold text-stone-950 shadow-2xs animate-pulse">
                    <span className="size-1.5 rounded-full bg-stone-950" />
                    {unreadCount}
                  </span>
                )}
              </Link>
              {isAdmin && (
                <Link
                  href={ROUTES.admin}
                  className="rounded-lg bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:hover:bg-amber-900/60"
                >
                  Painel Admin
                </Link>
              )}
              <Button variant="ghost" onClick={signOut}>
                Sair
              </Button>
            </>
          ) : (
            <>
              <Link
                href={ROUTES.login}
                className="rounded-lg px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100 dark:text-stone-200 dark:hover:bg-stone-800"
              >
                Entrar
              </Link>
              <Link
                href={ROUTES.cadastro}
                className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
              >
                Cadastrar
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
