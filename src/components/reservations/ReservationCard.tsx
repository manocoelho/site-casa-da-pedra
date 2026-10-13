"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { CalendarIcon, CheckIcon, ClockIcon } from "@/components/ui/icons";
import { ReservationCalendar } from "@/components/reservations/ReservationCalendar";
import { useReservation } from "@/hooks/useReservation";
import { formatCurrency } from "@/lib/format";
import { ROUTES } from "@/lib/routes";
import type { FlatWithPhotos } from "@/types/entities";

interface ReservationCardProps {
  flat: FlatWithPhotos;
  isAuthenticated: boolean;
  className?: string;
}

export function ReservationCard({
  flat,
  isAuthenticated,
  className = "",
}: ReservationCardProps) {
  const {
    dateRange,
    setDateRange,
    occupiedIntervals,
    isLoadingAvailability,
    nights,
    totalPrice,
    selectionError,
    canConfirm,
    isSubmitting,
    error,
    confirmedReservation,
    confirmReservation,
    resetSelection,
  } = useReservation({
    flatId: flat.id,
    precoDiaria: flat.preco_diaria,
  });

  return (
    <aside
      className={`flex flex-col gap-5 rounded-3xl border border-stone-200 bg-white p-6 shadow-lg dark:border-stone-800 dark:bg-stone-900 ${className}`}
    >
      {/* Preço e diária */}
      <div className="flex items-baseline justify-between border-b border-stone-100 pb-4 dark:border-stone-800">
        <div>
          <span className="text-3xl font-bold tracking-tight text-stone-900 dark:text-stone-50">
            {formatCurrency(flat.preco_diaria)}
          </span>
          <span className="ml-1.5 text-sm text-stone-500 dark:text-stone-400">/ noite</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
          <ClockIcon className="size-3.5" />
          Mínimo 1 noite
        </span>
      </div>

      {/* Confirmação de Sucesso */}
      {confirmedReservation ? (
        <div className="flex flex-col gap-4 rounded-2xl bg-emerald-50 p-5 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex items-center gap-2 font-semibold">
            <div className="flex size-6 items-center justify-center rounded-full bg-emerald-600 text-white">
              <CheckIcon className="size-4" />
            </div>
            Reserva Solicitada com Sucesso!
          </div>

          <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
            Sua solicitação de reserva para o <strong>{flat.titulo}</strong> foi registrada com status{" "}
            <span className="font-semibold uppercase tracking-wider">pendente</span>. O administrador entrará em contato para confirmação.
          </p>

          <div className="rounded-xl bg-white/80 p-3 text-xs text-stone-700 shadow-2xs dark:bg-stone-900/80 dark:text-stone-300">
            <p>
              <strong>Check-in:</strong>{" "}
              {dateRange?.from
                ? format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                : confirmedReservation.data_inicio}
            </p>
            <p className="mt-1">
              <strong>Check-out:</strong>{" "}
              {dateRange?.to
                ? format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })
                : confirmedReservation.data_fim}
            </p>
            <p className="mt-1 font-semibold text-stone-900 dark:text-stone-100">
              Total ({nights} {nights === 1 ? "noite" : "noites"}): {formatCurrency(totalPrice)}
            </p>
          </div>

          <Button variant="outline" onClick={resetSelection} className="w-full text-xs">
            Fazer outra reserva
          </Button>
        </div>
      ) : (
        <>
          {/* Mensagens de erro */}
          {error && <Alert variant="error">{error}</Alert>}
          {selectionError && <Alert variant="error">{selectionError}</Alert>}

          {/* Calendário interativo */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-stone-700 uppercase tracking-wider dark:text-stone-300">
                <CalendarIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
                Selecione as datas
              </label>
              {dateRange?.from && (
                <button
                  type="button"
                  onClick={resetSelection}
                  className="text-xs text-amber-600 hover:underline dark:text-amber-400"
                >
                  Limpar datas
                </button>
              )}
            </div>

            <ReservationCalendar
              selectedRange={dateRange}
              onSelectRange={setDateRange}
              occupiedIntervals={occupiedIntervals}
              isLoading={isLoadingAvailability}
            />
          </div>

          {/* Resumo da seleção */}
          {dateRange?.from && (
            <div className="flex flex-col gap-2 rounded-2xl border border-stone-100 bg-stone-50 p-4 text-xs dark:border-stone-800 dark:bg-stone-950/60">
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>Check-in:</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {format(dateRange.from, "dd 'de' MMM, yyyy", { locale: ptBR })}
                </span>
              </div>

              {dateRange.to && (
                <>
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>Check-out:</span>
                    <span className="font-semibold text-stone-900 dark:text-stone-100">
                      {format(dateRange.to, "dd 'de' MMM, yyyy", { locale: ptBR })}
                    </span>
                  </div>

                  <div className="my-1 border-t border-stone-200 dark:border-stone-800" />

                  <div className="flex justify-between text-stone-700 dark:text-stone-300">
                    <span>
                      {formatCurrency(flat.preco_diaria)} × {nights} {nights === 1 ? "noite" : "noites"}
                    </span>
                    <span className="font-semibold text-stone-900 dark:text-stone-100">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>

                  <div className="flex justify-between text-sm font-bold text-stone-950 dark:text-stone-50">
                    <span>Total estimado</span>
                    <span className="text-amber-700 dark:text-amber-400">
                      {formatCurrency(totalPrice)}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Botão de Ação */}
          <div className="pt-2">
            {!isAuthenticated ? (
              <div className="flex flex-col gap-2">
                <Link
                  href={`${ROUTES.login}?next=${encodeURIComponent(`/flats/${flat.id}`)}`}
                  className="flex h-12 w-full items-center justify-center rounded-xl bg-stone-900 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
                >
                  Entrar para reservar
                </Link>
                <p className="text-center text-xs text-stone-500 dark:text-stone-400">
                  Você precisa estar logado para confirmar sua estadia.
                </p>
              </div>
            ) : (
              <Button
                variant="primary"
                fullWidth
                className="h-12 text-base font-semibold"
                disabled={!canConfirm}
                isLoading={isSubmitting}
                onClick={confirmReservation}
              >
                {!dateRange?.from
                  ? "Selecione a data de check-in"
                  : !dateRange?.to
                    ? "Selecione a data de check-out"
                    : isSubmitting
                      ? "Confirmando reserva..."
                      : `Confirmar Reserva (${nights} ${nights === 1 ? "noite" : "noites"})`}
              </Button>
            )}
          </div>
        </>
      )}

      {/* Garantia e regras */}
      <div className="flex flex-col gap-1.5 border-t border-stone-100 pt-4 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
        <p>• Cancelamento gratuito em até 48h após a reserva.</p>
        <p>• Horário padrão de check-in às 14h e check-out às 12h.</p>
      </div>
    </aside>
  );
}
