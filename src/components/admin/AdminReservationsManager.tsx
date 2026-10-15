"use client";

import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import {
  BellIcon,
  SearchIcon,
  Volume2Icon,
  VolumeXIcon,
} from "@/components/ui/icons";
import { AdminReservationsTable } from "@/components/admin/AdminReservationsTable";
import {
  type AdminReservationFilter,
  type AdminReservationsHookReturn,
} from "@/hooks/useAdminReservations";
import { formatCurrency } from "@/lib/format";
import type { AdminReservation } from "@/types/reservations";

interface AdminReservationsManagerProps {
  reservationsHook: AdminReservationsHookReturn;
  className?: string;
}

export function AdminReservationsManager({
  reservationsHook,
  className = "",
}: AdminReservationsManagerProps) {
  const {
    reservations,
    allReservations,
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
  } = reservationsHook;

  const filterTabs: Array<{ id: AdminReservationFilter; label: string; count: number }> = [
    { id: "todas", label: "Todas", count: allReservations.length },
    { id: "pendente", label: "Pendentes", count: stats.pendingCount },
    { id: "confirmada", label: "Confirmadas", count: stats.confirmedCount },
    { id: "concluida", label: "Concluídas", count: stats.completedCount },
    { id: "cancelada", label: "Canceladas", count: stats.cancelledCount },
  ];

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {/* Header com controles de áudio e status realtime */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-stone-50">
              Reservas dos Hóspedes
            </h2>
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
              title="Monitoramento automático em tempo real ativado"
            >
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Tempo Real
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Aprove solicitações pendentes, acompanhe o faturamento previsto e receba alertas sonoros a cada nova reserva.
          </p>
        </div>

        {/* Controles de Som */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleSound}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              isSoundEnabled
                ? "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                : "border-stone-200 bg-stone-100 text-stone-500 hover:bg-stone-200 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"
            }`}
            title={isSoundEnabled ? "Clique para silenciar o aviso sonoro" : "Clique para ativar o aviso sonoro"}
          >
            {isSoundEnabled ? (
              <>
                <Volume2Icon className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Alerta Sonoro Ativado</span>
              </>
            ) : (
              <>
                <VolumeXIcon className="size-3.5 text-stone-400" />
                <span>Alerta Silenciado</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={testSound}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-2xs transition hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700 active:scale-95"
            title="Ouvir o toque de recepção para testar seu alto-falante"
          >
            <BellIcon className="size-3.5 text-amber-600 dark:text-amber-400" />
            <span>Testar Som</span>
          </button>
        </div>
      </div>

      {/* Banner de Nova Proposta de Reserva Recebida */}
      {newAlert && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-amber-100/60 p-4 shadow-sm dark:border-amber-800 dark:from-amber-950/40 dark:to-amber-900/20">
          <div className="flex items-center gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-stone-950 shadow-xs">
              <BellIcon className="size-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                  🔔 Nova Proposta de Reserva Recebida!
                </span>
                <span className="rounded-full bg-amber-200/80 px-2 py-0.2 text-[10px] font-bold text-amber-950 dark:bg-amber-900/80 dark:text-amber-200">
                  Pendente
                </span>
              </div>
              <p className="mt-0.5 text-sm text-amber-950 dark:text-amber-100">
                O hóspede <strong>{newAlert.guestName}</strong> solicitou reserva para o{" "}
                <strong>{newAlert.flatTitle}</strong> ({newAlert.checkIn} a {newAlert.checkOut}).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissAlert}
            className="rounded-xl p-2 text-stone-500 hover:bg-amber-200/50 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-amber-900/50 dark:hover:text-stone-200"
            title="Dispensar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {error && <Alert variant="error">{error}</Alert>}

      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {/* Pendentes */}
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-xs dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider dark:text-amber-300">
            Pendentes de Aprovação
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-900 dark:text-amber-200">
              {stats.pendingCount}
            </span>
            {stats.pendingCount > 0 && (
              <span className="size-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </div>
        </div>

        {/* Confirmadas */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
            Confirmadas / Ativas
          </p>
          <p className="mt-2 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.confirmedCount}
          </p>
        </div>

        {/* Faturamento Previsto */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
            Faturamento Estimado
          </p>
          <p className="mt-2 text-3xl font-bold text-stone-900 dark:text-stone-50">
            {formatCurrency(stats.totalRevenue)}
          </p>
        </div>

        {/* Total Geral */}
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">
            Total de Pedidos
          </p>
          <p className="mt-2 text-3xl font-bold text-stone-900 dark:text-stone-50">
            {stats.totalCount}
          </p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200 pb-3 dark:border-stone-800">
        {/* Abas de status */}
        <div className="flex flex-wrap items-center gap-1.5">
          {filterTabs.map((tab) => {
            const isSelected = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterStatus(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? "bg-stone-900 text-white shadow-2xs dark:bg-amber-500 dark:text-stone-950"
                    : "bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-900 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isSelected
                      ? "bg-white/20 text-white dark:bg-stone-950/20 dark:text-stone-950"
                      : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Busca */}
        <div className="relative w-full sm:w-64">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por hóspede ou flat..."
            className="w-full rounded-xl border border-stone-200 bg-white py-1.5 pr-3 pl-8 text-xs text-stone-900 placeholder:text-stone-400 focus:border-amber-500 focus:outline-hidden dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:focus:border-amber-500"
          />
        </div>
      </div>

      {/* Conteúdo da Tabela */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-12 text-stone-500">
          <Spinner className="size-6 text-amber-500" />
          <p className="mt-2 text-xs">Carregando reservas...</p>
        </div>
      ) : reservations.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 p-12 text-center text-stone-500 dark:border-stone-800">
          <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
            Nenhuma reserva encontrada
          </p>
          <p className="mt-1 text-xs">
            {searchQuery
              ? "Tente buscar por outro termo ou limpe o campo de pesquisa."
              : "Não há reservas cadastradas com o filtro selecionado."}
          </p>
        </div>
      ) : (
        <AdminReservationsTable
          reservations={reservations}
          onUpdateStatus={updateStatus}
          updatingId={updatingId}
        />
      )}
    </div>
  );
}
