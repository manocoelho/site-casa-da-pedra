"use client";

import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  InstagramIcon,
  WhatsAppIcon,
} from "@/components/ui/icons";
import { ReservationCalendar } from "@/components/reservations/ReservationCalendar";
import { useReservation } from "@/hooks/useReservation";
import { formatCurrency } from "@/lib/format";
import { buildInstagramUrl, buildWhatsAppUrl } from "@/lib/contact";
import { siteConfig } from "@/config/site";
import { ROUTES } from "@/lib/routes";
import type { FlatWithPhotos } from "@/types/entities";

interface ReservationCardProps {
  flat: FlatWithPhotos;
  isAuthenticated: boolean;
  whatsapp?: string;
  instagram?: string;
  className?: string;
}

export function ReservationCard({
  flat,
  isAuthenticated,
  whatsapp,
  instagram,
  className = "",
}: ReservationCardProps) {
  const {
    dateRange,
    setDateRange,
    occupiedIntervals,
    datePricesMap,
    nightlyBreakdown,
    hasCustomPricesInSelection,
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
          <span className="ml-1.5 text-sm text-stone-500 dark:text-stone-400">/ noite (base)</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
          <ClockIcon className="size-3.5" />
          Mínimo 1 noite
        </span>
      </div>

      {/* Confirmação de Sucesso */}
      {confirmedReservation ? (
        <div className="flex flex-col gap-4 rounded-2xl bg-emerald-50 p-5 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex items-center gap-2.5 font-semibold text-emerald-950 dark:text-emerald-100">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
              <CheckIcon className="size-4 stroke-[2.5]" />
            </div>
            <span className="text-sm sm:text-base">Reserva Solicitada com Sucesso!</span>
          </div>

          <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
            Sua solicitação de reserva para o <strong>{flat.titulo}</strong> foi registrada com status{" "}
            <span className="inline-block rounded-md bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-amber-900 dark:bg-amber-950/80 dark:text-amber-300">
              PENDENTE
            </span>
            . O anfitrião entrará em contato para confirmação.
          </p>

          <div className="rounded-xl border border-emerald-200/60 bg-white/90 p-3.5 text-xs text-stone-700 shadow-2xs dark:border-emerald-800/40 dark:bg-stone-900/90 dark:text-stone-300">
            <p>
              <strong className="text-stone-900 dark:text-stone-100">Check-in:</strong>{" "}
              {dateRange?.from
                ? format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                : confirmedReservation.data_inicio}
            </p>
            <p className="mt-1">
              <strong className="text-stone-900 dark:text-stone-100">Check-out:</strong>{" "}
              {dateRange?.to
                ? format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })
                : confirmedReservation.data_fim}
            </p>
            <p className="mt-2 border-t border-stone-100 pt-2 font-bold text-stone-900 dark:border-stone-800 dark:text-stone-100">
              Total ({nights} {nights === 1 ? "noite" : "noites"}): {formatCurrency(totalPrice)}
            </p>
          </div>

          {/* Formas de Contato Rápido (WhatsApp & Instagram) */}
          {(() => {
            const activeWhatsApp = whatsapp || siteConfig.contact.whatsapp;
            const activeInstagram = instagram || siteConfig.contact.instagram;
            const cleanInstagram = activeInstagram.replace(/^@/, "");

            const checkInDateStr = dateRange?.from
              ? format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
              : confirmedReservation.data_inicio;
            const checkOutDateStr = dateRange?.to
              ? format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })
              : confirmedReservation.data_fim;

            const whatsAppMessage = `Olá! Acabei de enviar uma proposta de reserva no site da Casa da Pedra para o flat "${flat.titulo}" (Check-in: ${checkInDateStr}, Check-out: ${checkOutDateStr}). Gostaria de agilizar a confirmação!`;
            const whatsAppUrl = buildWhatsAppUrl(activeWhatsApp, whatsAppMessage);
            const instagramUrl = buildInstagramUrl(activeInstagram);

            return (
              <div className="flex flex-col gap-2 rounded-xl border border-emerald-200/80 bg-white/80 p-3.5 shadow-2xs dark:border-emerald-800/60 dark:bg-stone-900/80">
                <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Deseja uma resposta mais rápida ou tem dúvidas?
                </p>
                <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
                  Fale diretamente conosco pelos canais oficiais:
                </p>

                <div className="mt-1 flex flex-col gap-2">
                  <a
                    href={whatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 active:scale-[0.99]"
                  >
                    <WhatsAppIcon className="size-4" />
                    <span>Conversar no WhatsApp</span>
                  </a>

                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-800 shadow-2xs transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 active:scale-[0.99]"
                  >
                    <InstagramIcon className="size-4 text-pink-600" />
                    <span>Instagram @{cleanInstagram}</span>
                  </a>
                </div>
              </div>
            );
          })()}

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
              datePricesMap={datePricesMap}
              basePrice={flat.preco_diaria}
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

                  {hasCustomPricesInSelection ? (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider dark:text-stone-400">
                        Detalhamento por diária ({nights} {nights === 1 ? "noite" : "noites"}):
                      </span>
                      <div className="max-h-36 space-y-1 overflow-y-auto pr-1">
                        {nightlyBreakdown.map((item) => {
                          const [yyyy, mm, dd] = item.date.split("-");
                          const formattedDay = `${dd}/${mm}/${yyyy}`;
                          return (
                            <div
                              key={item.date}
                              className="flex items-center justify-between text-stone-700 dark:text-stone-300"
                            >
                              <span className="flex items-center gap-1.5">
                                <span>{formattedDay}</span>
                                {item.isCustom && (
                                  <span className="rounded-sm bg-amber-100 px-1.5 py-0.2 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
                                    Tarifa especial
                                  </span>
                                )}
                              </span>
                              <span className="font-semibold text-stone-900 dark:text-stone-100">
                                {formatCurrency(item.price)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="my-0.5 border-t border-stone-200/70 dark:border-stone-800" />
                    </div>
                  ) : (
                    <div className="flex justify-between text-stone-700 dark:text-stone-300">
                      <span>
                        {formatCurrency(flat.preco_diaria)} × {nights} {nights === 1 ? "noite" : "noites"}
                      </span>
                      <span className="font-semibold text-stone-900 dark:text-stone-100">
                        {formatCurrency(totalPrice)}
                      </span>
                    </div>
                  )}

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
        <p>
          • Seus dados são protegidos conforme a{" "}
          <Link href={ROUTES.privacidade} className="underline hover:text-amber-600 dark:hover:text-amber-400">
            LGPD
          </Link>{" "}
          e utilizados exclusivamente para a gestão da sua estadia.
        </p>
      </div>
    </aside>
  );
}
