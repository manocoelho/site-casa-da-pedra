"use client";

import { Alert } from "@/components/ui/Alert";
import { Spinner } from "@/components/ui/Spinner";
import { SearchIcon } from "@/components/ui/icons";
import { AdminReservationsTable } from "@/components/admin/AdminReservationsTable";
import { useAdminReservations, type AdminReservationFilter } from "@/hooks/useAdminReservations";
import { formatCurrency } from "@/lib/format";
import type { AdminReservation } from "@/types/reservations";

interface AdminReservationsManagerProps {
  initialReservations?: AdminReservation[];
  className?: string;
}

export function AdminReservationsManager({
  initialReservations = [],
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
    updateStatus,
  } = useAdminReservations({ initialReservations });

  const filterTabs: Array<{ id: AdminReservationFilter; label: string; count: number }> = [
    { id: "todas", label: "Todas", count: allReservations.length },
    { id: "pendente", label: "Pendentes", count: stats.pendingCount },
    { id: "confirmada", label: "Confirmadas", count: stats.confirmedCount },
    { id: "concluida", label: "Concluídas", count: stats.completedCount },
    { id: "cancelada", label: "Canceladas", count: stats.cancelledCount },
  ];

  return (
    <div className={`flex flex-col gap-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-stone-900 sm:text-3xl dark:text-stone-50">
          Reservas dos Hóspedes
        </h2>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Aprove solicitações pendentes, acompanhe o faturamento previsto e entre em contato direto com os hóspedes.
        </p>
      </div>

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
