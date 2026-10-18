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

interface UseReservationOptions {
  flatId: string;
  precoDiaria: number | string;
  onSuccess?: (reservation: Reservation) => void;
}

export function useReservation({ flatId, precoDiaria, onSuccess }: UseReservationOptions) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [occupiedRanges, setOccupiedRanges] = useState<OccupiedDateRange[]>([]);
  const [datePricesMap, setDatePricesMap] = useState<DatePriceMap>({});
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);

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

    // 1. Carrega disponibilidade e preços por data imediatamente do banco
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

    // 2. Sincroniza em segundo plano com Airbnb/Booking (respeitando cache de 5 min)
    fetch(`/api/ical/sync?flatId=${encodeURIComponent(flatId)}`)
      .then((res) => res.json())
      .then((syncRes: { ok?: boolean; results?: unknown[] }) => {
        if (isMounted && syncRes?.ok && Array.isArray(syncRes.results) && syncRes.results.length > 0) {
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
        // [start, end): a data de saída ainda permite check-in do próximo hóspede
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
      const isCustom = typeof customPrice === "number" && Number.isFinite(customPrice);
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

      // Verifica se há alguma data bloqueada no meio do intervalo selecionado
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

  // Confirmar reserva
  const confirmReservation = useCallback(async () => {
    if (!canConfirm || !dateRange?.from || !dateRange?.to) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const dataInicio = format(dateRange.from, "yyyy-MM-dd");
      const dataFim = format(dateRange.to, "yyyy-MM-dd");

      // Atualiza os calendários externos antes de efetivar a reserva (evita overbooking)
      await fetch(`/api/ical/sync?flatId=${encodeURIComponent(flatId)}`).catch(() => null);

      const reservationsService = getBrowserReservationsService();
      const result = await reservationsService.createReservation({
        flatId,
        dataInicio,
        dataFim,
        valorTotal: totalPrice,
      });

      if (!result.ok || !result.data) {
        setError(result.error || "Não foi possível confirmar a reserva.");
        setIsSubmitting(false);
        return;
      }

      setConfirmedReservation(result.data);
      playSuccessChime();
      onSuccess?.(result.data);
      // Recarrega disponibilidade após nova reserva
      await loadAvailability();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro inesperado ao realizar reserva.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [canConfirm, dateRange, flatId, loadAvailability, onSuccess, totalPrice]);

  const resetSelection = useCallback(() => {
    setDateRange(undefined);
    setError(null);
    setConfirmedReservation(null);
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
