"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import {
  CalendarIcon,
  ChatIcon,
  CheckIcon,
  ClockIcon,
  MapPinIcon,
  WhatsAppIcon,
} from "@/components/ui/icons";
import { getBrowserReservationsService } from "@/services/reservations";
import { formatCurrency } from "@/lib/format";
import { buildWhatsAppUrl } from "@/lib/contact";
import { playSuccessChime } from "@/lib/sound";
import { siteConfig } from "@/config/site";
import { ROUTES } from "@/lib/routes";
import type { ClientReservation } from "@/types/reservations";
import type { PaymentStatusResponse } from "@/types/payments";

interface MyReservationsListProps {
  initialReservations: ClientReservation[];
  whatsapp?: string;
}

type FilterTab = "todas" | "confirmadas" | "pendentes" | "historico";

function formatDateBr(isoDate: string): string {
  try {
    return format(parseISO(isoDate), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return isoDate;
  }
}

export function MyReservationsList({
  initialReservations,
  whatsapp,
}: MyReservationsListProps) {
  const [reservations, setReservations] =
    useState<ClientReservation[]>(initialReservations);
  const [activeTab, setActiveTab] = useState<FilterTab>("todas");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [checkingPaymentId, setCheckingPaymentId] = useState<string | null>(
    null,
  );
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [copiedPixId, setCopiedPixId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const activeWhatsApp = whatsapp || siteConfig.contact.whatsapp;

  const refreshList = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const service = getBrowserReservationsService();
      const fresh = await service.listMyReservationsWithFlats();
      setReservations(fresh);
    } catch {
      // Ignora erro de atualização silenciosa
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Verifica automaticamente reservas pendentes a cada 8 segundos caso o cliente esteja aguardando aprovação do Pix
  useEffect(() => {
    const pendingList = reservations.filter((r) => r.status === "pendente");
    if (pendingList.length === 0) return;

    const timer = window.setInterval(async () => {
      for (const item of pendingList) {
        try {
          const res = await fetch(
            `/api/payments/status?reservation_id=${encodeURIComponent(item.id)}`,
          );
          const data = (await res.json()) as PaymentStatusResponse;
          if (data.ok && (data.isPaid || data.isExpired)) {
            if (data.isPaid) {
              playSuccessChime();
              setFeedbackMsg({
                type: "success",
                text: `Pagamento confirmado! Sua reserva #${item.id.slice(0, 8).toUpperCase()} já está CONFIRMADA.`,
              });
            }
            await refreshList();
            break;
          }
        } catch {
          // Ignora falha de rede
        }
      }
    }, 8000);

    return () => window.clearInterval(timer);
  }, [reservations, refreshList]);

  const handleCheckPaymentStatus = async (reservation: ClientReservation) => {
    setCheckingPaymentId(reservation.id);
    setFeedbackMsg(null);
    try {
      const res = await fetch(
        `/api/payments/status?reservation_id=${encodeURIComponent(reservation.id)}`,
      );
      const data = (await res.json()) as PaymentStatusResponse;

      if (data.ok && data.isPaid) {
        playSuccessChime();
        setFeedbackMsg({
          type: "success",
          text: `Pagamento aprovado! Sua reserva #${reservation.id.slice(0, 8).toUpperCase()} foi confirmada automaticamente.`,
        });
        await refreshList();
      } else if (data.ok && data.isExpired) {
        setFeedbackMsg({
          type: "error",
          text: "O prazo de 30 minutos para pagamento desta pré-reserva expirou.",
        });
        await refreshList();
      } else {
        setFeedbackMsg({
          type: "error",
          text: "Ainda não identificamos a confirmação bancária. Assim que você concluir o pagamento no app do banco, aguarde alguns segundos e clique novamente.",
        });
      }
    } catch {
      setFeedbackMsg({
        type: "error",
        text: "Não foi possível consultar o status do pagamento agora.",
      });
    } finally {
      setCheckingPaymentId(null);
    }
  };

  const handleCancelReservation = async (reservation: ClientReservation) => {
    const confirmed = window.confirm(
      `Deseja realmente cancelar a reserva #${reservation.id.slice(0, 8).toUpperCase()} (${reservation.flats?.titulo || "Flat"})?`,
    );
    if (!confirmed) return;

    setCancelingId(reservation.id);
    setFeedbackMsg(null);

    try {
      const service = getBrowserReservationsService();
      const result = await service.cancelReservation(reservation.id);
      if (!result.ok) {
        setFeedbackMsg({
          type: "error",
          text: result.error || "Não foi possível cancelar a reserva.",
        });
      } else {
        setFeedbackMsg({
          type: "success",
          text: `A reserva #${reservation.id.slice(0, 8).toUpperCase()} foi cancelada com sucesso.`,
        });
        await refreshList();
      }
    } catch {
      setFeedbackMsg({
        type: "error",
        text: "Erro ao cancelar a reserva.",
      });
    } finally {
      setCancelingId(null);
    }
  };

  const handleCopyPix = async (reservationId: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedPixId(reservationId);
      window.setTimeout(() => setCopiedPixId(null), 3000);
    } catch {
      // Fallback
    }
  };

  const counts = useMemo(() => {
    return {
      todas: reservations.length,
      confirmadas: reservations.filter((r) => r.status === "confirmada").length,
      pendentes: reservations.filter((r) => r.status === "pendente").length,
      historico: reservations.filter(
        (r) => r.status === "concluida" || r.status === "cancelada",
      ).length,
    };
  }, [reservations]);

  const filteredReservations = useMemo(() => {
    if (activeTab === "confirmadas") {
      return reservations.filter((r) => r.status === "confirmada");
    }
    if (activeTab === "pendentes") {
      return reservations.filter((r) => r.status === "pendente");
    }
    if (activeTab === "historico") {
      return reservations.filter(
        (r) => r.status === "concluida" || r.status === "cancelada",
      );
    }
    return reservations;
  }, [reservations, activeTab]);

  return (
    <div className="flex flex-col gap-6">
      {/* Abas de filtro e botão de atualizar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4 dark:border-stone-800">
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "todas", label: `Todas (${counts.todas})` },
              {
                id: "confirmadas",
                label: `Confirmadas (${counts.confirmadas})`,
              },
              {
                id: "pendentes",
                label: `Aguardando Pagamento (${counts.pendentes})`,
              },
              {
                id: "historico",
                label: `Concluídas / Canceladas (${counts.historico})`,
              },
            ] as const
          ).map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-stone-900 text-white shadow-xs dark:bg-amber-500 dark:text-stone-950"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={refreshList}
          isLoading={isRefreshing}
          className="text-xs"
        >
          Atualizar lista
        </Button>
      </div>

      {feedbackMsg && (
        <Alert variant={feedbackMsg.type === "success" ? "success" : "error"}>
          {feedbackMsg.text}
        </Alert>
      )}

      {filteredReservations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-stone-200 bg-white px-6 py-16 text-center dark:border-stone-800 dark:bg-stone-900">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <CalendarIcon className="size-6" />
          </div>
          <h3 className="mt-4 text-base font-bold text-stone-900 dark:text-stone-100">
            Nenhuma reserva encontrada nesta aba
          </h3>
          <p className="mt-1 max-w-md text-xs text-stone-500 dark:text-stone-400">
            Escolha seu flat favorito na página inicial para planejar sua
            estadia em Bananeiras.
          </p>
          <Link
            href={ROUTES.home}
            className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-stone-900 px-5 text-xs font-semibold text-white transition hover:bg-stone-800 dark:bg-amber-500 dark:text-stone-950 dark:hover:bg-amber-400"
          >
            Ver Flats Disponíveis
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {filteredReservations.map((r) => {
            const shortCode = r.id.slice(0, 8).toUpperCase();
            const flatTitle = r.flats?.titulo || "Flat Casa da Pedra";
            const coverPhoto =
              r.flats?.flat_photos?.[0]?.url_imagem ||
              "/images/hero-casa-da-pedra.jpg";
            const checkInStr = formatDateBr(r.data_inicio);
            const checkOutStr = formatDateBr(r.data_fim);
            const nights = Math.max(
              1,
              differenceInCalendarDays(
                parseISO(r.data_fim),
                parseISO(r.data_inicio),
              ),
            );
            const fallbackTotal = nights * (Number(r.flats?.preco_diaria) || 0);
            const totalAmount =
              typeof r.valor_total === "number" && r.valor_total > 0
                ? Number(r.valor_total)
                : fallbackTotal;
            const discountAmount = Number(r.valor_desconto) || 0;

            const hasActivePixCode =
              r.status === "pendente" &&
              Boolean(r.pix_qr_code) &&
              (!r.pix_expira_em ||
                new Date(r.pix_expira_em).getTime() > Date.now());

            const whatsAppMsg = `Olá! Gostaria de falar sobre a minha reserva #${shortCode} para o flat "${flatTitle}" (${checkInStr} a ${checkOutStr}).`;
            const whatsAppUrl = buildWhatsAppUrl(activeWhatsApp, whatsAppMsg);

            return (
              <article
                key={r.id}
                className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xs transition hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="grid grid-cols-1 md:grid-cols-12">
                  {/* Foto de Capa do Flat */}
                  <div className="relative min-h-48 w-full bg-stone-100 md:col-span-4 dark:bg-stone-800">
                    <Image
                      src={coverPhoto}
                      alt={flatTitle}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <div className="absolute top-3 left-3 rounded-lg bg-stone-950/80 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-300 backdrop-blur">
                      Reserva #{shortCode}
                    </div>
                  </div>

                  {/* Detalhes da Reserva */}
                  <div className="flex flex-col justify-between gap-4 p-5 sm:p-6 md:col-span-8">
                    <div className="flex flex-col gap-3">
                      {/* Cabeçalho com Status */}
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-xs text-stone-500 dark:text-stone-400">
                            <MapPinIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
                            <span>
                              R. Antonio Maia, 54 · Bananeiras, Paraíba
                            </span>
                          </div>
                          <h3 className="mt-1 text-xl font-bold text-stone-900 dark:text-stone-50">
                            {flatTitle}
                          </h3>
                        </div>

                        {/* Badges de Status */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {r.status === "confirmada" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <CheckIcon className="size-3.5" />
                              Confirmada
                            </span>
                          )}
                          {r.status === "pendente" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-300">
                              <ClockIcon className="size-3.5" />
                              Aguardando Pagamento
                            </span>
                          )}
                          {r.status === "concluida" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-900 dark:bg-blue-950/60 dark:text-blue-300">
                              Estadia Concluída
                            </span>
                          )}
                          {r.status === "cancelada" && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-400">
                              Cancelada
                            </span>
                          )}

                          {r.status_pagamento === "aprovado" && (
                            <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white">
                              Pago ({r.metodo_pagamento === "cartao" ? "Cartão" : "Pix"})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Grade de Datas e Valores */}
                      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-stone-100 bg-stone-50 p-3.5 text-xs sm:grid-cols-4 dark:border-stone-800 dark:bg-stone-950/60">
                        <div>
                          <span className="block text-[11px] text-stone-500 dark:text-stone-400">
                            Check-in (14h)
                          </span>
                          <strong className="mt-0.5 block text-sm text-stone-900 dark:text-stone-100">
                            {checkInStr}
                          </strong>
                        </div>

                        <div>
                          <span className="block text-[11px] text-stone-500 dark:text-stone-400">
                            Check-out (12h)
                          </span>
                          <strong className="mt-0.5 block text-sm text-stone-900 dark:text-stone-100">
                            {checkOutStr}
                          </strong>
                        </div>

                        <div>
                          <span className="block text-[11px] text-stone-500 dark:text-stone-400">
                            Duração
                          </span>
                          <strong className="mt-0.5 block text-sm text-stone-900 dark:text-stone-100">
                            {nights} {nights === 1 ? "noite" : "noites"}
                          </strong>
                        </div>

                        <div>
                          <span className="block text-[11px] text-stone-500 dark:text-stone-400">
                            Valor Total
                          </span>
                          <strong className="mt-0.5 block text-sm text-emerald-700 dark:text-emerald-400">
                            {formatCurrency(totalAmount)}
                          </strong>
                          {discountAmount > 0 && (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                              (-{formatCurrency(discountAmount)} no Pix)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Área de pagamento Pix pendente (caso ainda esteja dentro dos 30 min) */}
                      {hasActivePixCode && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            {r.pix_qr_code_base64 && (
                              <div className="mx-auto shrink-0 rounded-xl border border-stone-200 bg-white p-2 sm:mx-0">
                                <img
                                  src={`data:image/png;base64,${r.pix_qr_code_base64}`}
                                  alt="QR Code Pix"
                                  className="size-28 object-contain"
                                />
                              </div>
                            )}

                            <div className="flex flex-1 flex-col gap-2">
                              <p className="text-xs font-bold text-emerald-950 dark:text-emerald-200">
                                Pagamento Pix Pendente — Conclua para confirmar
                                automaticamente:
                              </p>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  readOnly
                                  value={r.pix_qr_code || ""}
                                  className="w-full rounded-xl border border-stone-200 bg-white px-3 py-1.5 font-mono text-[11px] text-stone-700 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
                                />
                                <Button
                                  type="button"
                                  variant="primary"
                                  onClick={() =>
                                    handleCopyPix(r.id, r.pix_qr_code || "")
                                  }
                                  className="shrink-0 px-3 text-xs"
                                >
                                  {copiedPixId === r.id
                                    ? "Copiado!"
                                    : "Copiar Pix"}
                                </Button>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <Button
                                  type="button"
                                  variant="primary"
                                  isLoading={checkingPaymentId === r.id}
                                  onClick={() => handleCheckPaymentStatus(r)}
                                  className="text-xs"
                                >
                                  Já paguei — Verificar pagamento agora
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3 dark:border-stone-800">
                      <div className="flex flex-wrap items-center gap-2">
                        {r.flats?.id && (
                          <Link
                            href={ROUTES.flatDetails(r.flats.id)}
                            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                          >
                            <CalendarIcon className="size-3.5" />
                            <span>Ver Flat / Avaliar</span>
                          </Link>
                        )}

                        <Link
                          href={ROUTES.chat}
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                        >
                          <ChatIcon className="size-3.5" />
                          <span>Chat do Site</span>
                        </Link>

                        <a
                          href={whatsAppUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
                        >
                          <WhatsAppIcon className="size-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      </div>

                      {r.status === "pendente" && (
                        <button
                          type="button"
                          disabled={cancelingId === r.id}
                          onClick={() => handleCancelReservation(r)}
                          className="inline-flex h-9 items-center justify-center rounded-xl border border-red-200 px-3 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                        >
                          {cancelingId === r.id ? (
                            <Spinner className="size-3.5" />
                          ) : (
                            "Cancelar pedido"
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
