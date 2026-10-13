"use client";

import { useMemo, useState } from "react";
import { format, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { SearchIcon, ShieldIcon, UserIcon } from "@/components/ui/icons";
import type { ChatConversation } from "@/types/chat";
import type { UserProfile } from "@/types/entities";

interface ChatSidebarProps {
  conversations: ChatConversation[];
  activeInterlocutorId?: string;
  onSelectConversation: (interlocutorId: string) => void;
  adminContact?: UserProfile | null;
  isAdmin: boolean;
  className?: string;
}

export function ChatSidebar({
  conversations,
  activeInterlocutorId,
  onSelectConversation,
  adminContact,
  isAdmin,
  className = "",
}: ChatSidebarProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return conversations;
    const lower = search.toLowerCase();
    return conversations.filter(
      (c) =>
        c.interlocutorNome.toLowerCase().includes(lower) ||
        (c.ultimoConteudo && c.ultimoConteudo.toLowerCase().includes(lower)),
    );
  }, [conversations, search]);

  function formatTime(isoString?: string): string {
    if (!isoString) return "";
    try {
      const date = parseISO(isoString);
      if (isToday(date)) {
        return format(date, "HH:mm", { locale: ptBR });
      }
      return format(date, "dd/MM", { locale: ptBR });
    } catch {
      return "";
    }
  }

  const hasAdminInList =
    adminContact &&
    conversations.some((c) => c.interlocutorId === adminContact.id);

  return (
    <aside
      className={`flex flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900 ${className}`}
    >
      {/* Cabeçalho da Sidebar */}
      <div className="flex h-16 items-center justify-between border-b border-stone-200 px-4 dark:border-stone-800">
        <h2 className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">
          Mensagens
        </h2>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
          {conversations.length} {conversations.length === 1 ? "conversa" : "conversas"}
        </span>
      </div>

      {/* Campo de Busca */}
      <div className="border-b border-stone-100 p-3 dark:border-stone-800">
        <div className="relative flex items-center">
          <SearchIcon className="pointer-events-none absolute left-3 size-4 text-stone-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar conversa..."
            className="w-full rounded-xl border border-stone-200 bg-stone-50 py-2 pr-3 pl-9 text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:bg-white focus:outline-hidden dark:border-stone-800 dark:bg-stone-950 dark:text-stone-100 dark:focus:border-amber-500"
          />
        </div>
      </div>

      {/* Atalho fixo para o suporte/anfitrião (caso o cliente não tenha conversas ainda) */}
      {!isAdmin && adminContact && !hasAdminInList && (
        <div className="border-b border-stone-100 p-2 dark:border-stone-800">
          <button
            type="button"
            onClick={() => onSelectConversation(adminContact.id)}
            className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${
              activeInterlocutorId === adminContact.id
                ? "bg-amber-50 dark:bg-amber-950/40"
                : "hover:bg-stone-50 dark:hover:bg-stone-800/50"
            }`}
          >
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-amber-500 text-stone-950 font-bold">
              CP
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="truncate text-xs font-bold text-stone-900 dark:text-stone-100">
                  {adminContact.nome || "Anfitrião Casa da Pedra"}
                </span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-semibold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                  <ShieldIcon className="size-2.5" />
                  Dono
                </span>
              </div>
              <p className="truncate text-[11px] text-stone-500 dark:text-stone-400">
                Fale diretamente com o proprietário
              </p>
            </div>
          </button>
        </div>
      )}

      {/* Lista de Conversas */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-stone-500">
            <UserIcon className="size-8 text-stone-300 dark:text-stone-700" />
            <p className="mt-2 font-medium">Nenhuma conversa encontrada</p>
            <p className="mt-0.5 text-[11px] text-stone-400">
              {isAdmin
                ? "Aguardando mensagens de hóspedes."
                : "Envie uma mensagem para falar com o anfitrião."}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-stone-100 dark:divide-stone-800">
            {filtered.map((conv) => {
              const isSelected = activeInterlocutorId === conv.interlocutorId;
              const initial = conv.interlocutorNome.charAt(0).toUpperCase() || "?";

              return (
                <li key={conv.interlocutorId}>
                  <button
                    type="button"
                    onClick={() => onSelectConversation(conv.interlocutorId)}
                    className={`flex w-full items-center gap-3 p-3.5 text-left transition ${
                      isSelected
                        ? "bg-amber-50/80 dark:bg-amber-950/40"
                        : "hover:bg-stone-50 dark:hover:bg-stone-800/40"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`flex size-11 shrink-0 items-center justify-center rounded-full font-bold text-sm ${
                        conv.interlocutorRole === "admin"
                          ? "bg-amber-500 text-stone-950"
                          : "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
                      }`}
                    >
                      {initial}
                    </div>

                    {/* Dados da conversa */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-xs font-semibold text-stone-900 dark:text-stone-100">
                          {conv.interlocutorNome}
                        </span>
                        {conv.ultimoTimestamp && (
                          <span className="shrink-0 text-[10px] text-stone-400">
                            {formatTime(conv.ultimoTimestamp)}
                          </span>
                        )}
                      </div>

                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                          {conv.ultimoConteudo || "Conversa iniciada"}
                        </p>
                        {conv.interlocutorRole === "admin" && (
                          <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.2 text-[9px] font-semibold text-amber-900 dark:bg-amber-900/60 dark:text-amber-200">
                            Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
