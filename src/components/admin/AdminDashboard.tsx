"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FlatPhotoManager } from "@/components/admin/FlatPhotoManager";
import { FlatEditModal } from "@/components/admin/FlatEditModal";
import { FlatCreateModal } from "@/components/admin/FlatCreateModal";
import { AdminReservationsManager } from "@/components/admin/AdminReservationsManager";
import { AdminSiteContentManager } from "@/components/admin/AdminSiteContentManager";
import { AdminIcalManager } from "@/components/admin/AdminIcalManager";
import {
  BellIcon,
  CalendarIcon,
  ImageIcon,
  PencilIcon,
  PlusIcon,
  RefreshIcon,
  TrashIcon,
  UsersIcon,
} from "@/components/ui/icons";
import { formatCurrency, formatGuests } from "@/lib/format";
import { getBrowserFlatsService } from "@/services/flats";
import { revalidateFlatsCache } from "@/app/admin/actions";
import { defaultSiteSettings } from "@/services/siteSettings";
import { useAdminReservations } from "@/hooks/useAdminReservations";
import type { Flat, FlatPhoto, FlatWithPhotos } from "@/types/entities";
import type { AdminReservation } from "@/types/reservations";
import type { SiteSettingsData } from "@/types/siteSettings";

interface AdminDashboardProps {
  initialFlats: FlatWithPhotos[];
  initialReservations?: AdminReservation[];
  initialSiteSettings?: SiteSettingsData;
}

export function AdminDashboard({
  initialFlats,
  initialReservations = [],
  initialSiteSettings = defaultSiteSettings,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<"reservas" | "flats" | "ical" | "conteudo">("reservas");
  const [flats, setFlats] = useState<FlatWithPhotos[]>(initialFlats);
  const [selectedFlatId, setSelectedFlatId] = useState<string>(
    initialFlats[0]?.id || "",
  );
  const [isEditingFlat, setIsEditingFlat] = useState(false);
  const [isCreatingFlat, setIsCreatingFlat] = useState(false);

  const activeFlat = useMemo(
    () => flats.find((f) => f.id === selectedFlatId) || flats[0] || null,
    [flats, selectedFlatId],
  );

  // Estatísticas do painel
  const stats = useMemo(() => {
    const totalFlats = flats.length;
    const totalPhotos = flats.reduce((acc, f) => acc + (f.flat_photos?.length || 0), 0);
    const avgPrice = totalFlats > 0
      ? flats.reduce((acc, f) => acc + Number(f.preco_diaria), 0) / totalFlats
      : 0;
    const totalCapacity = flats.reduce((acc, f) => acc + f.max_hospedes, 0);

    return { totalFlats, totalPhotos, avgPrice, totalCapacity };
  }, [flats]);

  const reservationsHook = useAdminReservations({ initialReservations });
  const pendingReservationsCount = reservationsHook.stats.pendingCount;

  function handlePhotoAdded(photo: FlatPhoto) {
    if (!activeFlat) return;
    setFlats((prev) =>
      prev.map((f) =>
        f.id === activeFlat.id
          ? { ...f, flat_photos: [...f.flat_photos, photo] }
          : f,
      ),
    );
  }

  function handlePhotoDeleted(photoId: string) {
    if (!activeFlat) return;
    setFlats((prev) =>
      prev.map((f) =>
        f.id === activeFlat.id
          ? { ...f, flat_photos: f.flat_photos.filter((p) => p.id !== photoId) }
          : f,
      ),
    );
  }

  function handleFlatUpdated(updated: Flat) {
    setFlats((prev) =>
      prev.map((f) =>
        f.id === updated.id
          ? { ...f, ...updated }
          : f,
      ),
    );
  }

  function handleFlatCreated(newFlat: FlatWithPhotos) {
    setFlats((prev) => [...prev, newFlat]);
    setSelectedFlatId(newFlat.id);
  }

  async function handleDeleteFlat(flatId: string, titulo: string) {
    if (
      !window.confirm(
        `Tem certeza que deseja excluir o flat "${titulo}"? Todas as fotos e reservas associadas serão removidas permanentemente.`,
      )
    ) {
      return;
    }

    try {
      const flatsService = getBrowserFlatsService();
      await flatsService.delete(flatId);
      await revalidateFlatsCache();
      setFlats((prev) => {
        const filtered = prev.filter((f) => f.id !== flatId);
        if (selectedFlatId === flatId) {
          setSelectedFlatId(filtered[0]?.id || "");
        }
        return filtered;
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erro ao excluir flat.");
    }
  }

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Cabeçalho do Dashboard */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-50">
          Painel de Administração
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600 dark:text-stone-400">
          Gerencie as reservas dos hóspedes, fotos e informações dos flats da Casa da Pedra.
        </p>
      </div>

      {/* Navegação por Abas Principais */}
      <div className="flex flex-wrap border-b border-stone-200 dark:border-stone-800">
        <button
          type="button"
          onClick={() => setActiveTab("reservas")}
          className={`relative inline-flex items-center gap-2.5 border-b-2 px-6 py-3.5 text-sm font-semibold transition ${
            activeTab === "reservas"
              ? "border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400"
              : "border-transparent text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
          }`}
        >
          <CalendarIcon className="size-4" />
          <span>Reservas dos Hóspedes</span>
          {pendingReservationsCount > 0 ? (
            <span className="inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white shadow-2xs">
              {pendingReservationsCount}
            </span>
          ) : (
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-400">
              {reservationsHook.allReservations.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("flats")}
          className={`relative inline-flex items-center gap-2.5 border-b-2 px-6 py-3.5 text-sm font-semibold transition ${
            activeTab === "flats"
              ? "border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400"
              : "border-transparent text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
          }`}
        >
          <ImageIcon className="size-4" />
          <span>Flats & Fotos</span>
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-400">
            {flats.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("ical")}
          className={`relative inline-flex items-center gap-2.5 border-b-2 px-6 py-3.5 text-sm font-semibold transition ${
            activeTab === "ical"
              ? "border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400"
              : "border-transparent text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
          }`}
        >
          <RefreshIcon className="size-4" />
          <span>Sincronização (Airbnb / Booking)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("conteudo")}
          className={`relative inline-flex items-center gap-2.5 border-b-2 px-6 py-3.5 text-sm font-semibold transition ${
            activeTab === "conteudo"
              ? "border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400"
              : "border-transparent text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
          }`}
        >
          <PencilIcon className="size-4" />
          <span>Página Inicial & Capa</span>
        </button>
      </div>

      {/* Notificação Flutuante quando nova proposta chega em outra aba */}
      {activeTab !== "reservas" && reservationsHook.newAlert && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/40 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-stone-950 shadow-xs">
              <BellIcon className="size-4 animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-950 dark:text-amber-100">
                🔔 Nova Proposta de Reserva Recebida!
              </p>
              <p className="text-xs text-amber-900/80 dark:text-amber-300">
                Hóspede <strong>{reservationsHook.newAlert.guestName}</strong> solicitou reserva para o{" "}
                <strong>{reservationsHook.newAlert.flatTitle}</strong> ({reservationsHook.newAlert.checkIn} a {reservationsHook.newAlert.checkOut}).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setActiveTab("reservas")}
              className="h-8 px-3 text-xs font-semibold"
            >
              Ver Reserva
            </Button>
            <button
              type="button"
              onClick={reservationsHook.dismissAlert}
              className="rounded-lg p-1.5 text-stone-500 hover:bg-stone-200 dark:text-stone-400 dark:hover:bg-stone-800"
              title="Dispensar aviso"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {activeTab === "reservas" ? (
        <AdminReservationsManager reservationsHook={reservationsHook} />
      ) : activeTab === "ical" ? (
        <AdminIcalManager flats={flats} />
      ) : activeTab === "conteudo" ? (
        <AdminSiteContentManager initialSettings={initialSiteSettings} />
      ) : (
        <div className="flex flex-col gap-8">
          {/* Cards de Métricas */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Total de Flats
          </p>
          <p className="mt-2 text-2xl font-bold text-stone-900 dark:text-stone-50">
            {stats.totalFlats}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Fotos Cadastradas
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">
            {stats.totalPhotos}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Diária Média
          </p>
          <p className="mt-2 text-2xl font-bold text-stone-900 dark:text-stone-50">
            {formatCurrency(stats.avgPrice)}
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
          <p className="text-xs font-medium uppercase tracking-wider text-stone-500">
            Capacidade Total
          </p>
          <p className="mt-2 text-2xl font-bold text-stone-900 dark:text-stone-50">
            {stats.totalCapacity} hóspedes
          </p>
        </div>
      </div>

      {flats.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 p-12 text-center text-stone-500 dark:border-stone-800">
          <p>Nenhum flat cadastrado no banco de dados.</p>
          <Button
            variant="primary"
            className="mt-4"
            leftIcon={<PlusIcon className="size-4" />}
            onClick={() => setIsCreatingFlat(true)}
          >
            Cadastrar primeiro flat
          </Button>
        </div>
      ) : (
        <>
          {/* Seletor de Flats (Tabs) + Botão de Novo Flat */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-3 dark:border-stone-800">
            <div className="flex flex-wrap items-center gap-2">
              {flats.map((flat) => {
                const isSelected = activeFlat?.id === flat.id;
                return (
                  <button
                    key={flat.id}
                    type="button"
                    onClick={() => setSelectedFlatId(flat.id)}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                      isSelected
                        ? "bg-stone-900 text-white shadow-xs dark:bg-amber-500 dark:text-stone-950"
                        : "bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-900 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
                    }`}
                  >
                    <span>{flat.titulo}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        isSelected
                          ? "bg-white/20 text-white dark:bg-stone-950/20 dark:text-stone-950"
                          : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                      }`}
                    >
                      {flat.flat_photos.length} fotos
                    </span>
                  </button>
                );
              })}
            </div>

            <Button
              variant="primary"
              leftIcon={<PlusIcon className="size-4" />}
              onClick={() => setIsCreatingFlat(true)}
            >
              Novo Flat
            </Button>
          </div>

          {activeFlat && (
            <div className="flex flex-col gap-8">
              {/* Resumo e Detalhes do Flat Ativo */}
              <div className="flex flex-col justify-between gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900 sm:flex-row sm:items-center sm:p-8">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-50">
                      {activeFlat.titulo}
                    </h2>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                      <UsersIcon className="size-3.5" />
                      Até {formatGuests(activeFlat.max_hospedes)}
                    </span>
                  </div>

                  <p className="max-w-2xl text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                    {activeFlat.descricao}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-start gap-3 border-t border-stone-100 pt-4 sm:items-end sm:border-t-0 sm:pt-0 dark:border-stone-800">
                  <div className="text-left sm:text-right">
                    <span className="text-xs text-stone-500 uppercase tracking-wider">Diária</span>
                    <p className="text-2xl font-bold text-stone-900 dark:text-stone-50">
                      {formatCurrency(activeFlat.preco_diaria)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      leftIcon={<PencilIcon className="size-4" />}
                      onClick={() => setIsEditingFlat(true)}
                    >
                      Editar informações
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:bg-red-50 hover:border-red-200 dark:text-red-400 dark:hover:bg-red-950/40"
                      leftIcon={<TrashIcon className="size-4" />}
                      onClick={() => handleDeleteFlat(activeFlat.id, activeFlat.titulo)}
                    >
                      Excluir flat
                    </Button>
                  </div>
                </div>
              </div>

              {/* Gerenciador de Fotos do Flat */}
              <FlatPhotoManager
                flat={activeFlat}
                onPhotoAdded={handlePhotoAdded}
                onPhotoDeleted={handlePhotoDeleted}
              />

              {/* Modal de Edição de Dados do Flat */}
              <FlatEditModal
                flat={activeFlat}
                isOpen={isEditingFlat}
                onClose={() => setIsEditingFlat(false)}
                onUpdated={handleFlatUpdated}
              />
            </div>
          )}

          {/* Modal de Criação de Novo Flat */}
          <FlatCreateModal
            isOpen={isCreatingFlat}
            onClose={() => setIsCreatingFlat(false)}
            onCreated={handleFlatCreated}
          />
        </>
      )}
        </div>
      )}
    </div>
  );
}
