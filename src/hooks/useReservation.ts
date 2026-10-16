"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  differenceInCalendarDays,
  format,
  isBefore,
  parseISO,
  startOfDay,
} from "date-fns";
import type { DateRange } from "react-day-picker";
import { getBrowserReservationsService } from "@/services/reservations";
import { playSuccessChime } from "@/lib/sound";
import type { Reservation } from "@/types/entities";
import type { OccupiedDateRange } from "@/types/reservations";

interface UseReservationOptions {
  flatId: string;
  precoDiaria: number | string;
  onSuccess?: (reservation: Reservation) => void;
}

export function useReservation({ flatId, precoDiaria, onSuccess }: UseReservationOptions) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [occupiedRanges, setOccupiedRanges] = useState<OccupiedDateRange[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedReservation, setConfirmedReservation] = useState<Reservation | null>(null);

  const pricePerNight = Number(precoDiaria) || 0;

  // Carrega intervalos ocupados do banco
  const loadAvailability = useCallback(async () => {
    setIsLoadingAvailability(true);
    try {
      const reservationsService = getBrowserReservationsService();
      const ranges = await reservationsService.getOccupiedRanges(flatId);
      setOccupiedRanges(ranges);
    } catch (err) {
      console.error("[useReservation] Erro ao carregar disponibilidade:", err);
    } finally {
      setIsLoadingAvailability(false);
    }
  }, [flatId]);

  useEffect(() => {
    let isMounted = true;
    const reservationsService = getBrowserReservationsService();

    // 1. Carrega disponibilidade imediata do banco
    reservationsService
      .getOccupiedRanges(flatId)
      .then((ranges) => {
        if (isMounted) {
          setOccupiedRanges(ranges);
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

  // Calcula noites e valor total
  const nights = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) return 0;
    const diff = differenceInCalendarDays(dateRange.to, dateRange.from);
    return Math.max(0, diff);
  }, [dateRange]);

  const totalPrice = useMemo(() => {
    return nights * pricePerNight;
  }, [nights, pricePerNight]);

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
        const current = new Date(dateRange.from);
        current.setDate(current.getDate() + i);
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
  }, [canConfirm, dateRange, flatId, loadAvailability, onSuccess]);

  const resetSelection = useCallback(() => {
    setDateRange(undefined);
    setError(null);
    setConfirmedReservation(null);
  }, []);

  return {
    dateRange,
    setDateRange,
    occupiedIntervals,
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
