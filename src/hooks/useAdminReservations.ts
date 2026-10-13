"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { getBrowserReservationsService } from "@/services/reservations";
import type { ReservationStatus } from "@/types/entities";
import type { AdminReservation } from "@/types/reservations";

export type AdminReservationFilter = "todas" | ReservationStatus;

interface UseAdminReservationsOptions {
  initialReservations?: AdminReservation[];
}

export function useAdminReservations({ initialReservations = [] }: UseAdminReservationsOptions = {}) {
  const [reservations, setReservations] = useState<AdminReservation[]>(initialReservations);
  const [isLoading, setIsLoading] = useState<boolean>(initialReservations.length === 0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<AdminReservationFilter>("todas");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const loadReservations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const service = getBrowserReservationsService();
      const list = await service.listAllReservations();
      setReservations(list);
    } catch (err) {
      console.error("[useAdminReservations] Erro ao carregar reservas:", err);
      setError("Não foi possível carregar a lista de reservas.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    getBrowserReservationsService()
      .listAllReservations()
      .then((list) => {
        if (isMounted) {
          setReservations(list);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.error("[useAdminReservations] Erro ao carregar reservas:", err);
        if (isMounted) {
          setError("Não foi possível carregar a lista de reservas.");
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Atualização de status da reserva
  const updateStatus = useCallback(
    async (reservationId: string, newStatus: ReservationStatus) => {
      setError(null);
      setUpdatingId(reservationId);

      try {
        const service = getBrowserReservationsService();
        const result = await service.updateReservationStatus(reservationId, newStatus);

        if (!result.ok) {
          setError(result.error || "Falha ao atualizar o status da reserva.");
          return;
        }

        setReservations((prev) =>
          prev.map((r) => (r.id === reservationId ? { ...r, status: newStatus } : r)),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao atualizar status.";
        setError(msg);
      } finally {
        setUpdatingId(null);
      }
    },
    [],
  );

  // Métricas gerais
  const stats = useMemo(() => {
    const totalCount = reservations.length;
    const pendingCount = reservations.filter((r) => r.status === "pendente").length;
    const confirmedCount = reservations.filter((r) => r.status === "confirmada").length;
    const completedCount = reservations.filter((r) => r.status === "concluida").length;
    const cancelledCount = reservations.filter((r) => r.status === "cancelada").length;

    let totalRevenue = 0;
    for (const r of reservations) {
      if (r.status === "confirmada" || r.status === "concluida") {
        try {
          const nights = Math.max(
            1,
            differenceInCalendarDays(parseISO(r.data_fim), parseISO(r.data_inicio)),
          );
          const price = Number(r.flats?.preco_diaria) || 0;
          totalRevenue += nights * price;
        } catch {
          // ignore date parse error
        }
      }
    }

    return {
      totalCount,
      pendingCount,
      confirmedCount,
      completedCount,
      cancelledCount,
      totalRevenue,
    };
  }, [reservations]);

  // Lista filtrada
  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      // Filtro de status
      if (filterStatus !== "todas" && r.status !== filterStatus) {
        return false;
      }

      // Filtro de texto
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const userName = r.users?.nome?.toLowerCase() || "";
        const userEmail = r.users?.email?.toLowerCase() || "";
        const flatTitle = r.flats?.titulo?.toLowerCase() || "";
        const matches =
          userName.includes(query) ||
          userEmail.includes(query) ||
          flatTitle.includes(query);

        if (!matches) return false;
      }

      return true;
    });
  }, [reservations, filterStatus, searchQuery]);

  return {
    reservations: filteredReservations,
    allReservations: reservations,
    isLoading,
    updatingId,
    error,
    stats,
    filterStatus,
    setFilterStatus,
    searchQuery,
    setSearchQuery,
    updateStatus,
    refresh: loadReservations,
  };
}
