"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { FlatPhotoManager } from "@/components/admin/FlatPhotoManager";
import { FlatEditModal } from "@/components/admin/FlatEditModal";
import { PencilIcon, UsersIcon } from "@/components/ui/icons";
import { formatCurrency, formatGuests } from "@/lib/format";
import type { Flat, FlatPhoto, FlatWithPhotos } from "@/types/entities";

interface AdminDashboardProps {
  initialFlats: FlatWithPhotos[];
}

export function AdminDashboard({ initialFlats }: AdminDashboardProps) {
  const [flats, setFlats] = useState<FlatWithPhotos[]>(initialFlats);
  const [selectedFlatId, setSelectedFlatId] = useState<string>(
    initialFlats[0]?.id || "",
  );
  const [isEditingFlat, setIsEditingFlat] = useState(false);

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

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Cabeçalho do Dashboard */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl dark:text-stone-50">
          Gerenciamento de Flats
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600 dark:text-stone-400">
          Gerencie fotos, diárias e informações dos flats da Casa da Pedra. As alterações
          são refletidas automaticamente na vitrine pública.
        </p>
      </div>

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
          Nenhum flat encontrado no banco de dados. Execute a migration de seed para cadastrar os flats iniciais.
        </div>
      ) : (
        <>
          {/* Seletor de Flats (Tabs) */}
          <div className="flex flex-wrap items-center gap-2 border-b border-stone-200 pb-3 dark:border-stone-800">
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

                  <Button
                    variant="outline"
                    leftIcon={<PencilIcon className="size-4" />}
                    onClick={() => setIsEditingFlat(true)}
                  >
                    Editar informações
                  </Button>
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
        </>
      )}
    </div>
  );
}
