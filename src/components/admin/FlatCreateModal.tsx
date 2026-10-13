"use client";

import { useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { getBrowserFlatsService } from "@/services/flats";
import { revalidateFlatsCache } from "@/app/admin/actions";
import type { FlatWithPhotos } from "@/types/entities";

interface FlatCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (newFlat: FlatWithPhotos) => void;
}

export function FlatCreateModal({
  isOpen,
  onClose,
  onCreated,
}: FlatCreateModalProps) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [precoDiaria, setPrecoDiaria] = useState("450");
  const [maxHospedes, setMaxHospedes] = useState("4");
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
      const created = await flatsService.create({
        titulo: titulo.trim(),
        descricao: descricao.trim(),
        preco_diaria: preco,
        max_hospedes: hospedes,
      });

      if (!created) {
        throw new Error("Não foi possível cadastrar o flat.");
      }

      await revalidateFlatsCache();

      // Flat recém-criado vem com array vazio de fotos
      const createdWithPhotos: FlatWithPhotos = {
        ...created,
        flat_photos: [],
      };

      onCreated(createdWithPhotos);
      // Reseta form
      setTitulo("");
      setDescricao("");
      setPrecoDiaria("450");
      setMaxHospedes("4");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao cadastrar flat.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-create-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
      />

      {/* Modal card */}
      <div className="relative w-full max-w-lg rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-stone-800 dark:bg-stone-900 sm:p-8">
        <h3 id="modal-create-title" className="text-xl font-bold text-stone-900 dark:text-stone-50">
          Cadastrar novo flat
        </h3>
        <p className="mt-1 text-xs text-stone-500">
          Adicione uma nova acomodação à Casa da Pedra. Após o cadastro, você poderá adicionar fotos para ela.
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
            placeholder="Ex.: Flat C - Vista Jardim"
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
              htmlFor="flat-create-descricao"
              className="text-sm font-medium text-stone-700 dark:text-stone-300"
            >
              Descrição
            </label>
            <textarea
              id="flat-create-descricao"
              rows={4}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="rounded-lg border border-stone-300 bg-white p-3 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100"
              placeholder="Descreva a estrutura, comodidades e diferenciais deste flat..."
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
              Cadastrar flat
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
