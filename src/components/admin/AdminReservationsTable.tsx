"use client";

import Link from "next/link";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Spinner } from "@/components/ui/Spinner";
import { ChatIcon, CheckIcon } from "@/components/ui/icons";
import { formatCurrency } from "@/lib/format";
import type { ReservationStatus } from "@/types/entities";
import type { AdminReservation } from "@/types/reservations";

interface AdminReservationsTableProps {
  reservations: AdminReservation[];
  onUpdateStatus: (id: string, status: ReservationStatus) => void;
  updatingId: string | null;
}

export function AdminReservationsTable({
  reservations,
  onUpdateStatus,
  updatingId,
}: AdminReservationsTableProps) {
  function formatPeriod(startIso: string, endIso: string) {
    try {
      const start = parseISO(startIso);
      const end = parseISO(endIso);
      const nights = Math.max(1, differenceInCalendarDays(end, start));
      const text = `${format(start, "dd/MM/yyyy", { locale: ptBR })} a ${format(end, "dd/MM/yyyy", { locale: ptBR })}`;
      return { text, nights };
    } catch {
      return { text: `${startIso} a ${endIso}`, nights: 1 };
    }
  }

  function renderStatusBadge(status: ReservationStatus) {
    switch (status) {
      case "pendente":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
            Pendente
          </span>
        );
      case "confirmada":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckIcon className="size-3" />
            Confirmada
          </span>
        );
      case "concluida":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
            Concluída
          </span>
        );
      case "cancelada":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-400">
            Cancelada
          </span>
        );
      default:
        return <span>{status}</span>;
    }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-xs dark:border-stone-800 dark:bg-stone-900">
      <table className="w-full text-left text-sm text-stone-700 dark:text-stone-300">
        <thead className="border-b border-stone-200 bg-stone-50/75 text-xs font-semibold text-stone-600 uppercase tracking-wider dark:border-stone-800 dark:bg-stone-950/60 dark:text-stone-400">
          <tr>
            <th className="px-5 py-4">Hóspede</th>
            <th className="px-5 py-4">Flat</th>
            <th className="px-5 py-4">Período</th>
            <th className="px-5 py-4">Valor Total</th>
            <th className="px-5 py-4">Status</th>
            <th className="px-5 py-4 text-right">Ações</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
          {reservations.map((r) => {
            const isUpdating = updatingId === r.id;
            const guestName = r.users?.nome || "Hóspede";
            const guestEmail = r.users?.email || "";
            const initial = guestName.charAt(0).toUpperCase() || "?";
            const flatTitle = r.flats?.titulo || "Flat";
            const pricePerNight = Number(r.flats?.preco_diaria) || 0;
            const { text: periodText, nights } = formatPeriod(r.data_inicio, r.data_fim);
            const totalPrice = nights * pricePerNight;

            return (
              <tr
                key={r.id}
                className="transition hover:bg-stone-50/50 dark:hover:bg-stone-850/50"
              >
                {/* Hóspede */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-stone-200 font-bold text-xs text-stone-800 dark:bg-stone-800 dark:text-stone-200">
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-stone-900 dark:text-stone-100">
                        {guestName}
                      </p>
                      {guestEmail && (
                        <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                          {guestEmail}
                        </p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Flat */}
                <td className="px-5 py-4">
                  <p className="font-medium text-stone-900 dark:text-stone-100">
                    {flatTitle}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {formatCurrency(pricePerNight)} / noite
                  </p>
                </td>

                {/* Período */}
                <td className="px-5 py-4">
                  <p className="font-medium text-stone-900 dark:text-stone-100">
                    {periodText}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {nights} {nights === 1 ? "noite" : "noites"}
                  </p>
                </td>

                {/* Valor Total */}
                <td className="px-5 py-4">
                  <span className="font-bold text-stone-900 dark:text-stone-100">
                    {formatCurrency(totalPrice)}
                  </span>
                </td>

                {/* Status */}
                <td className="px-5 py-4">
                  {renderStatusBadge(r.status)}
                </td>

                {/* Ações */}
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Botão de Chat com o Hóspede */}
                    <Link
                      href={`/chat?with=${r.user_id}`}
                      aria-label={`Conversar com ${guestName}`}
                      title="Conversar com o hóspede"
                      className="inline-flex size-8 items-center justify-center rounded-lg border border-stone-200 text-stone-600 transition hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                    >
                      <ChatIcon className="size-4" />
                    </Link>

                    {/* Ações dependendo do status atual */}
                    {r.status === "pendente" && (
                      <>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => onUpdateStatus(r.id, "confirmada")}
                          className="inline-flex h-8 items-center justify-center rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {isUpdating ? <Spinner className="size-3" /> : "Confirmar"}
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => onUpdateStatus(r.id, "cancelada")}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-red-200 px-2.5 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          Recusar
                        </button>
                      </>
                    )}

                    {r.status === "confirmada" && (
                      <>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => onUpdateStatus(r.id, "concluida")}
                          className="inline-flex h-8 items-center justify-center rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isUpdating ? <Spinner className="size-3" /> : "Concluir"}
                        </button>
                        <button
                          type="button"
                          disabled={isUpdating}
                          onClick={() => onUpdateStatus(r.id, "cancelada")}
                          className="inline-flex h-8 items-center justify-center rounded-lg border border-stone-200 px-2.5 text-xs font-medium text-stone-600 transition hover:bg-stone-100 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                        >
                          Cancelar
                        </button>
                      </>
                    )}

                    {r.status === "cancelada" && (
                      <button
                        type="button"
                        disabled={isUpdating}
                        onClick={() => onUpdateStatus(r.id, "pendente")}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-stone-200 px-2.5 text-xs font-medium text-stone-600 transition hover:bg-stone-100 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                      >
                        Reativar
                      </button>
                    )}

                    {r.status === "concluida" && (
                      <span className="text-xs text-stone-400">Finalizada</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
