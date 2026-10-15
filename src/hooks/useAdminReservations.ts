"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getBrowserReservationsService } from "@/services/reservations";
import { initAudioUnlock, playReservationAlert } from "@/lib/sound";
import type { Reservation, ReservationStatus } from "@/types/entities";
import type { AdminReservation } from "@/types/reservations";

export type AdminReservationFilter = "todas" | ReservationStatus;

export interface NewReservationAlertData {
  id: string;
  flatTitle: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  timestamp: number;
}

interface UseAdminReservationsOptions {
  initialReservations?: AdminReservation[];
}

export function useAdminReservations({
  initialReservations = [],
}: UseAdminReservationsOptions = {}) {
  const [reservations, setReservations] = useState<AdminReservation[]>(initialReservations);
  const [isLoading, setIsLoading] = useState<boolean>(initialReservations.length === 0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<AdminReservationFilter>("todas");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [newAlert, setNewAlert] = useState<NewReservationAlertData | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState<boolean>(true);

  // Armazena os IDs já conhecidos para evitar disparos indevidos
  const knownIdsRef = useRef<Set<string>>(
    new Set(initialReservations.map((r) => r.id)),
  );

  // Inicializa preferência de som do localStorage e desbloqueia áudio
  useEffect(() => {
    initAudioUnlock();
    try {
      const stored = localStorage.getItem("cp_admin_sound_enabled");
      if (stored !== null) {
        setIsSoundEnabled(stored !== "false");
      }
    } catch {
      // Ignora erro de localStorage desabilitado
    }
  }, []);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("cp_admin_sound_enabled", String(next));
      } catch {
        // Ignora
      }
      return next;
    });
  }, []);

  const testSound = useCallback(() => {
    playReservationAlert(true);
  }, []);

  const dismissAlert = useCallback(() => {
    setNewAlert(null);
  }, []);

  const loadReservations = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const service = getBrowserReservationsService();
      const list = await service.listAllReservations();
      for (const r of list) {
        knownIdsRef.current.add(r.id);
      }
      setReservations(list);
    } catch (err) {
      console.error("[useAdminReservations] Erro ao carregar reservas:", err);
      setError("Não foi possível carregar a lista de reservas.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    let isMounted = true;
    getBrowserReservationsService()
      .listAllReservations()
      .then((list) => {
        if (isMounted) {
          for (const r of list) {
            knownIdsRef.current.add(r.id);
          }
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

  // Subscrição Supabase Realtime para novas reservas e atualizações
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channelName = "admin-reservations-realtime";

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "reservations",
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const newRow = payload.new as Reservation;

            const isNew = !knownIdsRef.current.has(newRow.id);
            knownIdsRef.current.add(newRow.id);

            if (isNew) {
              // 🔔 Toca efeito sonoro da reserva!
              playReservationAlert();

              // Busca dados completos incluindo relacionamentos flats e users
              try {
                const { data, error } = await supabase
                  .from("reservations")
                  .select("*, flats(id, titulo, preco_diaria), users(id, nome, email)")
                  .eq("id", newRow.id)
                  .maybeSingle();

                if (!error && data) {
                  const fullRes = data as unknown as AdminReservation;
                  setReservations((prev) => [
                    fullRes,
                    ...prev.filter((r) => r.id !== newRow.id),
                  ]);

                  setNewAlert({
                    id: fullRes.id,
                    flatTitle: fullRes.flats?.titulo || "Flat",
                    guestName: fullRes.users?.nome || fullRes.users?.email || "Novo Hóspede",
                    checkIn: fullRes.data_inicio,
                    checkOut: fullRes.data_fim,
                    timestamp: Date.now(),
                  });
                } else {
                  loadReservations();
                }
              } catch {
                loadReservations();
              }
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedRow = payload.new as Reservation;
            setReservations((prev) =>
              prev.map((r) =>
                r.id === updatedRow.id
                  ? {
                      ...r,
                      status: updatedRow.status,
                      data_inicio: updatedRow.data_inicio,
                      data_fim: updatedRow.data_fim,
                      updated_at: updatedRow.updated_at,
                    }
                  : r,
              ),
            );
          } else if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { id: string };
            setReservations((prev) => prev.filter((r) => r.id !== oldRow.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadReservations]);

  // Polling de fallback (a cada 25s quando aba ativa) para garantir sincronia se websocket falhar
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;

      getBrowserReservationsService()
        .listAllReservations()
        .then((list) => {
          let hasNewPending = false;
          let newestItem: AdminReservation | null = null;

          for (const item of list) {
            if (!knownIdsRef.current.has(item.id)) {
              knownIdsRef.current.add(item.id);
              if (item.status === "pendente") {
                hasNewPending = true;
                if (!newestItem) newestItem = item;
              }
            }
          }

          if (hasNewPending) {
            playReservationAlert();
            if (newestItem) {
              setNewAlert({
                id: newestItem.id,
                flatTitle: newestItem.flats?.titulo || "Flat",
                guestName:
                  newestItem.users?.nome ||
                  newestItem.users?.email ||
                  "Hóspede",
                checkIn: newestItem.data_inicio,
                checkOut: newestItem.data_fim,
                timestamp: Date.now(),
              });
            }
          }

          setReservations(list);
        })
        .catch(() => {});
    }, 25000);

    return () => clearInterval(interval);
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
    newAlert,
    dismissAlert,
    isSoundEnabled,
    toggleSound,
    testSound,
    updateStatus,
    refresh: loadReservations,
  };
}

export type AdminReservationsHookReturn = ReturnType<typeof useAdminReservations>;
