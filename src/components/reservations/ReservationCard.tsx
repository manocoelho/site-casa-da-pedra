"use client";

import { useState } from "react";
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
  pixDiscountPercent?: number;
  maxInstallments?: number;
  className?: string;
}

function formatCountdown(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function ReservationCard({
  flat,
  isAuthenticated,
  whatsapp,
  instagram,
  pixDiscountPercent = 10,
  maxInstallments = 6,
  className = "",
}: ReservationCardProps) {
  const [copiedPix, setCopiedPix] = useState(false);

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
    pixDiscountAmount,
    pixFinalPrice,
    paymentMethod,
    setPaymentMethod,
    payerCpf,
    setPayerCpf,
    finalPriceForSelectedMethod,
    activePixPayment,
    secondsRemaining,
    isCheckingStatus,
    checkPaymentStatusNow,
    cancelActivePix,
    paidAmount,
    paidMethod,
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
    pixDiscountPercent,
    maxInstallments,
  });

  const handleCopyPixCode = async () => {
    if (!activePixPayment?.qrCode) return;
    try {
      await navigator.clipboard.writeText(activePixPayment.qrCode);
      setCopiedPix(true);
      window.setTimeout(() => setCopiedPix(false), 3000);
    } catch {
      // Fallback
    }
  };

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
          <span className="ml-1.5 text-sm text-stone-500 dark:text-stone-400">
            / noite (base)
          </span>
        </div>
        {pixDiscountPercent > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            {pixDiscountPercent}% OFF no Pix
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
            <ClockIcon className="size-3.5" />
            Mínimo 1 noite
          </span>
        )}
      </div>

      {/* 1. Confirmação de Reserva Paga (Automática) */}
      {confirmedReservation ? (
        <div className="flex flex-col gap-4 rounded-2xl bg-emerald-50 p-5 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex items-center gap-2.5 font-semibold text-emerald-950 dark:text-emerald-100">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white shadow-xs">
              <CheckIcon className="size-4 stroke-[2.5]" />
            </div>
            <span className="text-sm sm:text-base">
              Pagamento Aprovado & Reserva Confirmada!
            </span>
          </div>

          <p className="text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
            Seu pagamento foi processado com sucesso e sua hospedagem no{" "}
            <strong>{flat.titulo}</strong> já está com status{" "}
            <span className="inline-block rounded-md bg-emerald-600 px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-white">
              CONFIRMADA
            </span>{" "}
            automaticamente em nosso calendário.
          </p>

          <div className="rounded-xl border border-emerald-200/60 bg-white/90 p-3.5 text-xs text-stone-700 shadow-2xs dark:border-emerald-800/40 dark:bg-stone-900/90 dark:text-stone-300">
            {(dateRange?.from || confirmedReservation.data_inicio) && (
              <p>
                <strong className="text-stone-900 dark:text-stone-100">
                  Check-in:
                </strong>{" "}
                {dateRange?.from
                  ? format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                  : confirmedReservation.data_inicio}
              </p>
            )}
            {(dateRange?.to || confirmedReservation.data_fim) && (
              <p className="mt-1">
                <strong className="text-stone-900 dark:text-stone-100">
                  Check-out:
                </strong>{" "}
                {dateRange?.to
                  ? format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })
                  : confirmedReservation.data_fim}
              </p>
            )}
            <p className="mt-1">
              <strong className="text-stone-900 dark:text-stone-100">
                Forma de pagamento:
              </strong>{" "}
              {paidMethod === "cartao" ? "Cartão de Crédito" : "Pix"}
            </p>
            {(paidAmount || totalPrice > 0) && (
              <p className="mt-2 border-t border-stone-100 pt-2 font-bold text-emerald-700 dark:border-stone-800 dark:text-emerald-400">
                Total pago:{" "}
                {formatCurrency(paidAmount ?? finalPriceForSelectedMethod)}
              </p>
            )}
          </div>

          {/* Formas de Contato Rápido (WhatsApp & Instagram) */}
          {(() => {
            const activeWhatsApp = whatsapp || siteConfig.contact.whatsapp;
            const activeInstagram = instagram || siteConfig.contact.instagram;
            const cleanInstagram = activeInstagram.replace(/^@/, "");

            const checkInDateStr = dateRange?.from
              ? format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
              : confirmedReservation.data_inicio || "confirmado";
            const checkOutDateStr = dateRange?.to
              ? format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })
              : confirmedReservation.data_fim || "confirmado";

            const whatsAppMessage = `Olá! Acabei de confirmar e pagar minha reserva no site da Casa da Pedra para o flat "${flat.titulo}" (Check-in: ${checkInDateStr}, Check-out: ${checkOutDateStr}).`;
            const whatsAppUrl = buildWhatsAppUrl(
              activeWhatsApp,
              whatsAppMessage,
            );
            const instagramUrl = buildInstagramUrl(activeInstagram);

            return (
              <div className="flex flex-col gap-2 rounded-xl border border-emerald-200/80 bg-white/80 p-3.5 shadow-2xs dark:border-emerald-800/60 dark:bg-stone-900/80">
                <p className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                  Combinar detalhes do check-in:
                </p>
                <div className="mt-1 flex flex-col gap-2">
                  <a
                    href={whatsAppUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 active:scale-[0.99]"
                  >
                    <WhatsAppIcon className="size-4" />
                    <span>Falar com o anfitrião no WhatsApp</span>
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

          <Button
            variant="outline"
            onClick={resetSelection}
            className="w-full text-xs"
          >
            Fazer outra reserva
          </Button>
        </div>
      ) : activePixPayment ? (
        /* 2. Tela de QR Code Pix Ativo (Expiração em 30 minutos + Verificação Automática) */
        <div className="flex flex-col gap-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white">
              Pagamento via Pix
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 font-mono text-xs font-bold text-amber-900 dark:bg-amber-950/80 dark:text-amber-300">
              <ClockIcon className="size-3.5" />
              Expira em {formatCountdown(secondsRemaining)}
            </span>
          </div>

          <div className="text-center">
            <p className="text-xs text-stone-600 dark:text-stone-300">
              Escaneie o QR Code abaixo ou copie o código Pix no aplicativo do
              seu banco.
            </p>
            <p className="mt-1 text-lg font-extrabold text-emerald-700 dark:text-emerald-400">
              Valor com desconto: {formatCurrency(activePixPayment.amount)}
            </p>
            {activePixPayment.discountAmount > 0 && (
              <p className="text-[11px] text-stone-500 line-through">
                De {formatCurrency(activePixPayment.originalAmount)}
              </p>
            )}
          </div>

          {activePixPayment.qrCodeBase64 && (
            <div className="mx-auto flex items-center justify-center rounded-2xl border border-stone-200 bg-white p-3 shadow-xs">
              <img
                src={`data:image/png;base64,${activePixPayment.qrCodeBase64}`}
                alt="QR Code Pix para pagamento da reserva"
                className="size-48 object-contain"
              />
            </div>
          )}

          {/* Pix Copia e Cola */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-stone-600 uppercase tracking-wider dark:text-stone-400">
              Pix Copia e Cola
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={activePixPayment.qrCode}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 font-mono text-[11px] text-stone-700 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
              />
              <Button
                type="button"
                variant="primary"
                onClick={handleCopyPixCode}
                className="shrink-0 px-3 text-xs"
              >
                {copiedPix ? "Copiado!" : "Copiar"}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-emerald-200/70 bg-white/80 p-3 text-center text-[11px] leading-relaxed text-stone-600 dark:border-emerald-800/50 dark:bg-stone-900/80 dark:text-stone-300">
            <span className="inline-block size-2 animate-pulse rounded-full bg-emerald-500 mr-1.5" />
            Aguardando confirmação automática do banco... Assim que você pagar,
            esta tela confirmará sua reserva sozinha em poucos segundos.
          </div>

          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="primary"
              fullWidth
              isLoading={isCheckingStatus}
              onClick={checkPaymentStatusNow}
              className="text-xs font-semibold"
            >
              Já paguei — Verificar agora
            </Button>

            <button
              type="button"
              onClick={cancelActivePix}
              className="py-1.5 text-center text-xs font-medium text-stone-500 hover:text-stone-800 hover:underline dark:text-stone-400 dark:hover:text-stone-200"
            >
              Alterar forma de pagamento ou datas
            </button>
          </div>
        </div>
      ) : (
        /* 3. Seleção de Datas e Forma de Pagamento (Pix ou Cartão) */
        <>
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

          {/* Resumo da seleção e Escolha da Forma de Pagamento */}
          {dateRange?.from && (
            <div className="flex flex-col gap-3 rounded-2xl border border-stone-100 bg-stone-50 p-4 text-xs dark:border-stone-800 dark:bg-stone-950/60">
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>Check-in:</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100">
                  {format(dateRange.from, "dd 'de' MMM, yyyy", {
                    locale: ptBR,
                  })}
                </span>
              </div>

              {dateRange.to && (
                <>
                  <div className="flex justify-between text-stone-600 dark:text-stone-400">
                    <span>Check-out:</span>
                    <span className="font-semibold text-stone-900 dark:text-stone-100">
                      {format(dateRange.to, "dd 'de' MMM, yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>

                  <div className="my-0.5 border-t border-stone-200 dark:border-stone-800" />

                  {hasCustomPricesInSelection ? (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider dark:text-stone-400">
                        Detalhamento por diária ({nights}{" "}
                        {nights === 1 ? "noite" : "noites"}):
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
                        {formatCurrency(flat.preco_diaria)} × {nights}{" "}
                        {nights === 1 ? "noite" : "noites"}
                      </span>
                      <span className="font-semibold text-stone-900 dark:text-stone-100">
                        {formatCurrency(totalPrice)}
                      </span>
                    </div>
                  )}

                  {/* Seletor de Forma de Pagamento */}
                  <div className="mt-1 flex flex-col gap-2 border-t border-stone-200 pt-3 dark:border-stone-800">
                    <span className="text-[11px] font-semibold text-stone-700 uppercase tracking-wider dark:text-stone-300">
                      Forma de Pagamento (100% na reserva)
                    </span>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("pix")}
                        className={`flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition ${
                          paymentMethod === "pix"
                            ? "border-emerald-600 bg-emerald-50/70 ring-1 ring-emerald-600 dark:border-emerald-500 dark:bg-emerald-950/40"
                            : "border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="font-bold text-stone-900 dark:text-stone-100">
                            Pix
                          </span>
                          {pixDiscountPercent > 0 && (
                            <span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              -{pixDiscountPercent}%
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(pixFinalPrice)}
                        </span>
                        <span className="text-[10px] text-stone-500 dark:text-stone-400">
                          QR Code imediato
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("cartao")}
                        className={`flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition ${
                          paymentMethod === "cartao"
                            ? "border-amber-600 bg-amber-50/70 ring-1 ring-amber-600 dark:border-amber-500 dark:bg-amber-950/40"
                            : "border-stone-200 bg-white hover:bg-stone-50 dark:border-stone-800 dark:bg-stone-900"
                        }`}
                      >
                        <div className="flex w-full items-center justify-between">
                          <span className="font-bold text-stone-900 dark:text-stone-100">
                            Cartão
                          </span>
                          <span className="rounded-md bg-stone-200 px-1.5 py-0.5 text-[10px] font-semibold text-stone-800 dark:bg-stone-800 dark:text-stone-200">
                            Até {maxInstallments}x
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-stone-900 dark:text-stone-100">
                          {formatCurrency(totalPrice)}
                        </span>
                        <span className="text-[10px] text-stone-500 dark:text-stone-400">
                          Parcelado c/ juros
                        </span>
                      </button>
                    </div>

                    {/* Campo de CPF quando Pix está selecionado */}
                    {paymentMethod === "pix" && isAuthenticated && (
                      <div className="mt-1 flex flex-col gap-1">
                        <label
                          htmlFor="payer-cpf"
                          className="text-[11px] font-medium text-stone-600 dark:text-stone-400"
                        >
                          CPF do pagador (obrigatório para o QR Code Pix):
                        </label>
                        <input
                          id="payer-cpf"
                          type="text"
                          inputMode="numeric"
                          placeholder="000.000.000-00"
                          value={payerCpf}
                          onChange={(e) => setPayerCpf(e.target.value)}
                          className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs text-stone-900 placeholder:text-stone-400 focus:border-emerald-600 focus:outline-none dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
                        />
                      </div>
                    )}
                  </div>

                  {/* Resumo de Valor Final */}
                  <div className="mt-1 flex flex-col gap-1 border-t border-stone-200 pt-2.5 dark:border-stone-800">
                    {paymentMethod === "pix" && pixDiscountAmount > 0 && (
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                        <span>Desconto Pix ({pixDiscountPercent}%):</span>
                        <span className="font-semibold">
                          - {formatCurrency(pixDiscountAmount)}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between text-sm font-bold text-stone-950 dark:text-stone-50">
                      <span>Total a pagar</span>
                      <span
                        className={
                          paymentMethod === "pix"
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-amber-700 dark:text-amber-400"
                        }
                      >
                        {formatCurrency(finalPriceForSelectedMethod)}
                      </span>
                    </div>
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
                  Entrar para reservar e pagar
                </Link>
                <p className="text-center text-xs text-stone-500 dark:text-stone-400">
                  Você precisa estar logado para confirmar sua estadia.
                </p>
              </div>
            ) : (
              <Button
                variant="primary"
                fullWidth
                className="h-12 text-sm sm:text-base font-semibold"
                disabled={!canConfirm}
                isLoading={isSubmitting}
                onClick={confirmReservation}
              >
                {!dateRange?.from
                  ? "Selecione a data de check-in"
                  : !dateRange?.to
                    ? "Selecione a data de check-out"
                    : isSubmitting
                      ? "Iniciando pagamento..."
                      : paymentMethod === "pix"
                        ? `Pagar ${formatCurrency(pixFinalPrice)} no Pix`
                        : `Pagar ${formatCurrency(totalPrice)} no Cartão`}
              </Button>
            )}
          </div>
        </>
      )}

      {/* Garantia e regras */}
      <div className="flex flex-col gap-1.5 border-t border-stone-100 pt-4 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
        <p>
          • <strong>Cancelamento gratuito:</strong> reembolso integral (100%) em
          até 48h após a compra.
        </p>
        <p>• Confirmação 100% automática no calendário após o pagamento.</p>
        <p>• Horário padrão de check-in às 14h e check-out às 12h.</p>
        <p>
          • Pagamento processado com segurança pelo{" "}
          <strong>Mercado Pago</strong> e dados protegidos conforme a{" "}
          <Link
            href={ROUTES.privacidade}
            className="underline hover:text-amber-600 dark:hover:text-amber-400"
          >
            LGPD
          </Link>
          .
        </p>
      </div>
    </aside>
  );
}
