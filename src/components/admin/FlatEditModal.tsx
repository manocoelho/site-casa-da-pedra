"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { getBrowserFlatsService } from "@/services/flats";
import { revalidateFlatsCache } from "@/app/admin/actions";
import type { Flat, FlatWithPhotos } from "@/types/entities";

interface FlatEditModalProps {
  flat: FlatWithPhotos;
  isOpen: boolean;
  onClose: () => void;
  onUpdated: (updatedFlat: Flat) => void;
}

export function FlatEditModal({
  flat,
  isOpen,
  onClose,
  onUpdated,
}: FlatEditModalProps) {
  const [titulo, setTitulo] = useState(flat.titulo);
  const [descricao, setDescricao] = useState(flat.descricao);
  const [precoDiaria, setPrecoDiaria] = useState(String(flat.preco_diaria));
  const [maxHospedes, setMaxHospedes] = useState(String(flat.max_hospedes));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const preco = parseFloat(precoDiaria);
    const hospedes = parseInt(maxHospedes, 10);

    if (!titulo.trim()) {
      setError("O título do flat é obrigatório.");
      return;
    }
    if (isNaN(preco) || preco < 0) {
      setError("Informe um preço por diária válido.");
      return;
    }
    if (isNaN(hospedes) || hospedes <= 0) {
      setError("Informe a capacidade máxima de hóspedes (mínimo 1).");
      return;
    }

    setIsSubmitting(true);
    try {
      const flatsService = getBrowserFlatsService();
      const updated = await flatsService.update(flat.id, {
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        preco_diaria: preco,
        max_hospedes: hospedes,
      });

      if (!updated) {
        throw new Error("Não foi possível atualizar o flat.");
      }

      await revalidateFlatsCache();
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar alterações.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
      />

      {/* Modal card */}
      <div className="relative w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 sm:p-8">
        <h3 id="modal-title" className="text-xl font-bold text-stone-900 dark:text-stone-50">
          Editar dados do flat
        </h3>
        <p className="mt-1 text-xs text-stone-500">
          Altere informações como título, diária e descrição do imóvel.
        </p>

        {error && (
          <div className="mt-4">
            <Alert variant="error">{error}</Alert>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <TextField
            label="Título do flat"
            name="titulo"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Preço da diária (R$)"
              name="preco_diaria"
              type="number"
              step="0.01"
              min="0"
              value={precoDiaria}
              onChange={(e) => setPrecoDiaria(e.target.value)}
              required
            />
            <TextField
              label="Máx. de hóspedes"
              name="max_hospedes"
              type="number"
              min="1"
              value={maxHospedes}
              onChange={(e) => setMaxHospedes(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="flat-descricao"
              className="text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Descrição
            </label>
            <textarea
              id="flat-descricao"
              rows={4}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              placeholder="Descreva o flat e seus diferenciais..."
            />
          </div>

          <div className="mt-2 flex justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Salvar alterações
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
