"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  differenceInCalendarDays,
  format,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";
import type { DateRange } from "react-day-picker";
import { getBrowserReservationsService } from "@/services/reservations";
import { getBrowserPricingService } from "@/services/pricing";
import { playSuccessChime } from "@/lib/sound";
import type { Reservation } from "@/types/entities";
import type { OccupiedDateRange } from "@/types/reservations";
import type { DatePriceMap, NightPriceBreakdown } from "@/types/pricing";
import type {
  CreatePaymentResponse,
  PaymentMethod,
  PaymentStatusResponse,
  PixPaymentData,
} from "@/types/payments";

interface UseReservationOptions {
  flatId: string;
  precoDiaria: number | string;
  pixDiscountPercent?: number;
  maxInstallments?: number;
  onSuccess?: (reservation: Reservation) => void;
}

export function formatCpfInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

export function useReservation({
  flatId,
  precoDiaria,
  pixDiscountPercent = 10,
  maxInstallments = 6,
  onSuccess,
}: UseReservationOptions) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [occupiedRanges, setOccupiedRanges] = useState<OccupiedDateRange[]>([]);
  const [datePricesMap, setDatePricesMap] = useState<DatePriceMap>({});
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedReservation, setConfirmedReservation] =
    useState<Reservation | null>(null);

  // Estados de pagamento (Mercado Pago Pix e Cartão)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [payerCpf, setPayerCpf] = useState("");
  const [activePixPayment, setActivePixPayment] =
    useState<PixPaymentData | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number | null>(null);
  const [paidMethod, setPaidMethod] = useState<PaymentMethod | null>(null);

  const pricePerNight = Number(precoDiaria) || 0;

  // Carrega intervalos ocupados e preços personalizados do banco
  const loadAvailability = useCallback(async () => {
    setIsLoadingAvailability(true);
    try {
      const reservationsService = getBrowserReservationsService();
      const pricingService = getBrowserPricingService();
      const [ranges, pricesMap] = await Promise.all([
        reservationsService.getOccupiedRanges(flatId),
        pricingService.getDatePricesMap(flatId),
      ]);
      setOccupiedRanges(ranges);
      setDatePricesMap(pricesMap);
    } catch (err) {
      console.error("[useReservation] Erro ao carregar disponibilidade:", err);
    } finally {
      setIsLoadingAvailability(false);
    }
  }, [flatId]);

  useEffect(() => {
    let isMounted = true;
    const reservationsService = getBrowserReservationsService();
    const pricingService = getBrowserPricingService();

    Promise.all([
      reservationsService.getOccupiedRanges(flatId),
      pricingService.getDatePricesMap(flatId),
    ])
      .then(([ranges, pricesMap]) => {
        if (isMounted) {
          setOccupiedRanges(ranges);
          setDatePricesMap(pricesMap);
          setIsLoadingAvailability(false);
        }
      })
      .catch((err) => {
        console.error("[useReservation] Erro ao carregar disponibilidade:", err);
        if (isMounted) {
          setIsLoadingAvailability(false);
        }
      });

    // Sincroniza em segundo plano com Airbnb/Booking (respeitando cache de 5 min)
    fetch(`/api/ical/sync?flatId=${encodeURIComponent(flatId)}`)
      .then((res) => res.json())
      .then((syncRes: { ok?: boolean; results?: unknown[] }) => {
        if (
          isMounted &&
          syncRes?.ok &&
          Array.isArray(syncRes.results) &&
          syncRes.results.length > 0
        ) {
          reservationsService.getOccupiedRanges(flatId).then((freshRanges) => {
            if (isMounted) setOccupiedRanges(freshRanges);
          });
        }
      })
      .catch(() => {
        // Ignora silenciosamente erros de sync em background
      });

    return () => {
      isMounted = false;
    };
  }, [flatId]);

  // Verifica retorno do Checkout do Mercado Pago via parâmetros de URL (?payment=success&reservation_id=...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const paymentState = params.get("payment");
    const reservationId = params.get("reservation_id");
    const mpPaymentId =
      params.get("payment_id") || params.get("collection_id") || "";

    if (!paymentState || !reservationId) return;

    if (paymentState === "failure") {
      setError(
        "O pagamento via cartão não foi concluído ou foi recusado. Você pode tentar novamente ou escolher o pagamento via Pix com desconto.",
      );
      return;
    }

    setIsCheckingStatus(true);
    fetch(
      `/api/payments/status?reservation_id=${encodeURIComponent(
        reservationId,
      )}&payment_id=${encodeURIComponent(mpPaymentId)}`,
    )
      .then((res) => res.json())
      .then((statusRes: PaymentStatusResponse) => {
        if (statusRes.ok && statusRes.isPaid) {
          setPaidMethod("cartao");
          setConfirmedReservation({
            id: reservationId,
            flat_id: flatId,
            user_id: "",
            data_inicio: "",
            data_fim: "",
            status: "confirmada",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          playSuccessChime();
          loadAvailability();
        } else if (paymentState === "pending") {
          setError(
            "Seu pagamento está sendo processado pelo Mercado Pago. Assim que aprovado, sua reserva será confirmada automaticamente.",
          );
        }
      })
      .catch(() => null)
      .finally(() => {
        setIsCheckingStatus(false);
      });
  }, [flatId, loadAvailability]);

  // Contador regressivo de 30 minutos para o QR Code Pix
  useEffect(() => {
    if (!activePixPayment) {
      setSecondsRemaining(0);
      return;
    }

    const updateTimer = () => {
      const expiresMs = new Date(activePixPayment.expiresAt).getTime();
      const diffSec = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
      setSecondsRemaining(diffSec);

      if (diffSec <= 0) {
        setActivePixPayment(null);
        setError(
          "O tempo limite de 30 minutos para pagamento do Pix expirou e as datas foram liberadas novamente. Gere um novo código se desejar reservar.",
        );
        loadAvailability();
      }
    };

    updateTimer();
    const timerId = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timerId);
  }, [activePixPayment, loadAvailability]);

  // Função para consultar o status do pagamento Pix imediatamente ou via polling
  const checkPaymentStatusNow = useCallback(async () => {
    if (!activePixPayment) return;
    setIsCheckingStatus(true);

    try {
      const res = await fetch(
        `/api/payments/status?reservation_id=${encodeURIComponent(
          activePixPayment.reservationId,
        )}&payment_id=${encodeURIComponent(activePixPayment.paymentId)}`,
      );
      const data = (await res.json()) as PaymentStatusResponse;

      if (data.ok && data.isPaid) {
        const reservationObj: Reservation = {
          id: activePixPayment.reservationId,
          flat_id: flatId,
          user_id: "",
          data_inicio: dateRange?.from
            ? format(dateRange.from, "yyyy-MM-dd")
            : "",
          data_fim: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "",
          status: "confirmada",
          valor_total: activePixPayment.amount,
          valor_desconto: activePixPayment.discountAmount,
          metodo_pagamento: "pix",
          status_pagamento: "aprovado",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        setPaidAmount(activePixPayment.amount);
        setPaidMethod("pix");
        setActivePixPayment(null);
        setConfirmedReservation(reservationObj);
        playSuccessChime();
        onSuccess?.(reservationObj);
        await loadAvailability();
      } else if (data.ok && data.isExpired) {
        setActivePixPayment(null);
        setError(
          "O QR Code Pix expirou após 30 minutos sem pagamento e as datas foram liberadas.",
        );
        await loadAvailability();
      }
    } catch {
      // Ignora erro de rede temporário durante polling
    } finally {
      setIsCheckingStatus(false);
    }
  }, [activePixPayment, dateRange, flatId, loadAvailability, onSuccess]);

  // Polling automático a cada 4 segundos enquanto o QR Code Pix estiver aberto
  useEffect(() => {
    if (!activePixPayment) return;
    const intervalId = window.setInterval(() => {
      checkPaymentStatusNow();
    }, 4000);
    return () => window.clearInterval(intervalId);
  }, [activePixPayment, checkPaymentStatusNow]);

  // Converte os intervalos ocupados em objetos Date
  const occupiedIntervals = useMemo(() => {
    return occupiedRanges.map((range) => ({
      start: startOfDay(parseISO(range.data_inicio)),
      end: startOfDay(parseISO(range.data_fim)),
    }));
  }, [occupiedRanges]);

  // Função para saber se um determinado dia está ocupado
  const isDateOccupied = useCallback(
    (date: Date) => {
      const target = startOfDay(date);
      return occupiedIntervals.some((interval) => {
        return target >= interval.start && target < interval.end;
      });
    },
    [occupiedIntervals],
  );

  // Retorna o preço aplicável para uma determinada data
  const getPriceForDate = useCallback(
    (date: Date): { price: number; isCustom: boolean } => {
      const key = format(date, "yyyy-MM-dd");
      const custom = datePricesMap[key];
      if (typeof custom === "number" && Number.isFinite(custom)) {
        return { price: custom, isCustom: true };
      }
      return { price: pricePerNight, isCustom: false };
    },
    [datePricesMap, pricePerNight],
  );

  // Calcula noites e detalhamento noite a noite
  const nights = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 0;
    const diff = differenceInCalendarDays(dateRange.to, dateRange.from);
    return Math.max(0, diff);
  }, [dateRange]);

  const nightlyBreakdown = useMemo<NightPriceBreakdown[]>(() => {
    if (!dateRange?.from || !dateRange?.to || nights <= 0) return [];
    const list: NightPriceBreakdown[] = [];
    for (let i = 0; i < nights; i++) {
      const day = addDays(startOfDay(dateRange.from), i);
      const dateStr = format(day, "yyyy-MM-dd");
      const customPrice = datePricesMap[dateStr];
      const isCustom =
        typeof customPrice === "number" && Number.isFinite(customPrice);
      list.push({
        date: dateStr,
        price: isCustom ? customPrice : pricePerNight,
        isCustom,
      });
    }
    return list;
  }, [dateRange, nights, datePricesMap, pricePerNight]);

  const hasCustomPricesInSelection = useMemo(
    () => nightlyBreakdown.some((item) => item.isCustom),
    [nightlyBreakdown],
  );

  const totalPrice = useMemo(() => {
    if (nightlyBreakdown.length === 0) return 0;
    return nightlyBreakdown.reduce((acc, item) => acc + item.price, 0);
  }, [nightlyBreakdown]);

  // Cálculos de desconto Pix (ex.: 10%) e preço final conforme forma de pagamento
  const pixDiscountAmount = useMemo(() => {
    if (totalPrice <= 0 || pixDiscountPercent <= 0) return 0;
    return Math.round(totalPrice * (pixDiscountPercent / 100) * 100) / 100;
  }, [totalPrice, pixDiscountPercent]);

  const pixFinalPrice = useMemo(() => {
    if (totalPrice <= 0) return 0;
    return Math.max(1, Math.round((totalPrice - pixDiscountAmount) * 100) / 100);
  }, [totalPrice, pixDiscountAmount]);

  const finalPriceForSelectedMethod =
    paymentMethod === "pix" ? pixFinalPrice : totalPrice;

  // Validação do intervalo selecionado
  const selectionError = useMemo(() => {
    if (!dateRange?.from) return null;
    if (dateRange.from && dateRange.to) {
      if (isBefore(dateRange.to, dateRange.from)) {
        return "A data de check-out deve ser após a data de check-in.";
      }
      if (differenceInCalendarDays(dateRange.to, dateRange.from) === 0) {
        return "Selecione pelo menos 1 diária (check-out diferente do check-in).";
      }

      const daysCount = differenceInCalendarDays(dateRange.to, dateRange.from);
      for (let i = 0; i < daysCount; i++) {
        const current = addDays(startOfDay(dateRange.from), i);
        if (isDateOccupied(current)) {
          return "O período escolhido engloba datas indisponíveis. Selecione outro intervalo.";
        }
      }
    }
    return null;
  }, [dateRange, isDateOccupied]);

  const canConfirm = Boolean(
    dateRange?.from &&
      dateRange?.to &&
      nights > 0 &&
      !selectionError &&
      !isSubmitting,
  );

  // Iniciar pagamento (Pix ou Cartão de Crédito)
  const confirmReservation = useCallback(async () => {
    if (!canConfirm || !dateRange?.from || !dateRange?.to) return;

    const cleanDigits = payerCpf.replace(/\D/g, "");
    if (paymentMethod === "pix" && cleanDigits.length !== 11) {
      setError(
        "Informe o CPF do pagador (11 dígitos) para gerar o QR Code do Pix.",
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const dataInicio = format(dateRange.from, "yyyy-MM-dd");
      const dataFim = format(dateRange.to, "yyyy-MM-dd");

      // Atualiza os calendários externos antes de efetivar a pré-reserva (evita overbooking)
      await fetch(`/api/ical/sync?flatId=${encodeURIComponent(flatId)}`).catch(
        () => null,
      );

      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flatId,
          dataInicio,
          dataFim,
          paymentMethod,
          payerCpf: cleanDigits,
        }),
      });

      const result = (await response.json()) as CreatePaymentResponse;

      if (!response.ok || !result.ok) {
        setError(
          result.error || "Não foi possível iniciar o pagamento da reserva.",
        );
        setIsSubmitting(false);
        return;
      }

      if (result.paymentMethod === "pix" && result.pix) {
        setActivePixPayment(result.pix);
        await loadAvailability();
      } else if (result.paymentMethod === "cartao" && result.card?.checkoutUrl) {
        // Redireciona para o ambiente seguro de Cartão de Crédito do Mercado Pago
        window.location.href = result.card.checkoutUrl;
        return;
      }
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Erro inesperado ao iniciar o pagamento da reserva.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canConfirm,
    dateRange,
    flatId,
    loadAvailability,
    payerCpf,
    paymentMethod,
  ]);

  const cancelActivePix = useCallback(() => {
    setActivePixPayment(null);
    setError(null);
  }, []);

  const resetSelection = useCallback(() => {
    setDateRange(undefined);
    setError(null);
    setActivePixPayment(null);
    setConfirmedReservation(null);
    setPaidAmount(null);
    setPaidMethod(null);
  }, []);

  return {
    dateRange,
    setDateRange,
    occupiedIntervals,
    datePricesMap,
    getPriceForDate,
    nightlyBreakdown,
    hasCustomPricesInSelection,
    isDateOccupied,
    isLoadingAvailability,
    nights,
    totalPrice,
    pixDiscountPercent,
    pixDiscountAmount,
    pixFinalPrice,
    maxInstallments,
    paymentMethod,
    setPaymentMethod,
    payerCpf,
    setPayerCpf: (val: string) => setPayerCpf(formatCpfInput(val)),
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
    refreshAvailability: loadAvailability,
  };
}
