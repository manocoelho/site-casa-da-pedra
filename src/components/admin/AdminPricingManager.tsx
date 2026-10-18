"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import {
  CalendarIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  SparklesIcon,
  TrashIcon,
} from "@/components/ui/icons";
import { formatCurrency } from "@/lib/format";
import { getBrowserPricingService } from "@/services/pricing";
import { getBrowserReservationsService } from "@/services/reservations";
import { revalidateFlatsCache } from "@/app/admin/actions";
import type { FlatWithPhotos } from "@/types/entities";
import type { DatePriceMap, FlatDatePrice } from "@/types/pricing";
import type { OccupiedDateRange } from "@/types/reservations";

interface AdminPricingManagerProps {
  flats: FlatWithPhotos[];
}

const PRICING_MIGRATION_SQL = `-- Execute no SQL Editor do Supabase:
create table if not exists public.flat_date_prices (
  id          uuid primary key default gen_random_uuid(),
  flat_id     uuid not null references public.flats(id) on delete cascade,
  data        date not null,
  preco       numeric(10, 2) not null check (preco > 0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint flat_date_prices_unique_flat_date unique (flat_id, data)
);

create index if not exists idx_flat_date_prices_flat_data
  on public.flat_date_prices (flat_id, data);

alter table public.reservations
  add column if not exists valor_total numeric(10, 2);

alter table public.flat_date_prices enable row level security;

drop policy if exists "flat_date_prices_select_public" on public.flat_date_prices;
create policy "flat_date_prices_select_public"
  on public.flat_date_prices for select to anon, authenticated using (true);

drop policy if exists "flat_date_prices_admin_all" on public.flat_date_prices;
create policy "flat_date_prices_admin_all"
  on public.flat_date_prices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());`;

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function parsePriceInput(raw: string): number {
  const cleaned = raw.trim().replace(/[R$\s]/g, "");
  if (!cleaned) return NaN;
  // Se tiver vírgula, trata pontos como separador de milhar e vírgula como decimal
  if (cleaned.includes(",")) {
    const normalized = cleaned.replace(/\./g, "").replace(",", ".");
    return Number(normalized);
  }
  return Number(cleaned);
}

function formatBrDate(isoDate: string): string {
  const parts = isoDate.split("-");
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function AdminPricingManager({ flats }: AdminPricingManagerProps) {
  const [selectedFlatId, setSelectedFlatId] = useState<string>(flats[0]?.id || "");
  const [currentMonth, setCurrentMonth] = useState<Date>(() => startOfMonth(new Date()));
  const [selectionMode, setSelectionMode] = useState<"single" | "multiple">("single");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [priceInput, setPriceInput] = useState<string>("");

  // Seleção rápida por intervalo
  const [rangeStart, setRangeStart] = useState<string>("");
  const [rangeEnd, setRangeEnd] = useState<string>("");

  const [customPricesList, setCustomPricesList] = useState<FlatDatePrice[]>([]);
  const [occupiedRanges, setOccupiedRanges] = useState<OccupiedDateRange[]>([]);
  const [schemaMissing, setSchemaMissing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  const priceInputRef = useRef<HTMLInputElement>(null);

  const activeFlat = useMemo(
    () => flats.find((f) => f.id === selectedFlatId) || flats[0] || null,
    [flats, selectedFlatId],
  );

  const basePrice = Number(activeFlat?.preco_diaria) || 0;

  const datePricesMap = useMemo<DatePriceMap>(() => {
    const map: DatePriceMap = {};
    for (const row of customPricesList) {
      map[row.data] = Number(row.preco);
    }
    return map;
  }, [customPricesList]);

  const loadFlatPricingData = useCallback(async (flatId: string) => {
    if (!flatId) return;
    setIsLoading(true);
    setError(null);
    try {
      const pricingService = getBrowserPricingService();
      const reservationsService = getBrowserReservationsService();

      const [{ prices, schemaMissing: isMissing }, occupied] = await Promise.all([
        pricingService.listDatePrices(flatId),
        reservationsService.getOccupiedRanges(flatId),
      ]);

      setCustomPricesList(prices);
      setSchemaMissing(Boolean(isMissing));
      setOccupiedRanges(occupied);
    } catch (err) {
      console.error("[AdminPricingManager] Erro ao carregar preços:", err);
      setError("Não foi possível carregar o calendário de preços deste flat.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeFlat?.id) {
      loadFlatPricingData(activeFlat.id);
      setSelectedDates([]);
      setPriceInput("");
    }
  }, [activeFlat?.id, loadFlatPricingData]);

  // Verifica se uma data está ocupada
  const isDateOccupied = useCallback(
    (dateIso: string) => {
      return occupiedRanges.some(
        (r) => dateIso >= r.data_inicio && dateIso < r.data_fim,
      );
    },
    [occupiedRanges],
  );

  // Gera os dias da grade do mês visível
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [currentMonth]);

  // Ao clicar em um dia do calendário
  function handleDayClick(day: Date) {
    const dateIso = format(day, "yyyy-MM-dd");
    setError(null);
    setSuccessMsg(null);

    if (selectionMode === "single") {
      setSelectedDates([dateIso]);
      const currentVal = datePricesMap[dateIso] ?? basePrice;
      setPriceInput(currentVal.toFixed(2).replace(".", ","));
      setTimeout(() => {
        priceInputRef.current?.focus();
        priceInputRef.current?.select();
      }, 20);
    } else {
      setSelectedDates((prev) => {
        const exists = prev.includes(dateIso);
        const next = exists ? prev.filter((d) => d !== dateIso) : [...prev, dateIso].sort();
        if (next.length === 1) {
          const val = datePricesMap[next[0]] ?? basePrice;
          setPriceInput(val.toFixed(2).replace(".", ","));
        } else if (next.length > 1 && !priceInput) {
          setPriceInput(basePrice.toFixed(2).replace(".", ","));
        }
        return next;
      });
    }
  }

  // Selecionar um intervalo de datas pelo formulário auxiliar
  function handleSelectInterval() {
    if (!rangeStart || !rangeEnd) {
      setError("Informe a data inicial e a data final do período.");
      return;
    }
    if (rangeEnd < rangeStart) {
      setError("A data final deve ser igual ou posterior à data inicial.");
      return;
    }

    const start = startOfDay(parseISO(rangeStart));
    const end = startOfDay(parseISO(rangeEnd));
    const days = eachDayOfInterval({ start, end });
    const isoList = days.map((d) => format(d, "yyyy-MM-dd"));

    setSelectionMode("multiple");
    setSelectedDates(isoList);
    setCurrentMonth(startOfMonth(start));
    if (!priceInput) {
      setPriceInput(basePrice.toFixed(2).replace(".", ","));
    }
    setError(null);
    setSuccessMsg(`${isoList.length} ${isoList.length === 1 ? "data selecionada" : "datas selecionadas"}. Digite o valor abaixo e clique em Salvar.`);
    setTimeout(() => {
      priceInputRef.current?.focus();
      priceInputRef.current?.select();
    }, 20);
  }

  // Salvar preço personalizado para as datas selecionadas
  async function handleSavePrice(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!activeFlat) return;

    if (selectedDates.length === 0) {
      setError("Clique em pelo menos uma data no calendário para definir o preço.");
      return;
    }

    const numericPrice = parsePriceInput(priceInput);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      setError("Digite um valor válido maior que zero (ex.: 1000,00 ou 500,00).");
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const pricingService = getBrowserPricingService();
      const result = await pricingService.setDatesPrice(
        activeFlat.id,
        selectedDates,
        numericPrice,
      );

      if (!result.ok) {
        setError(result.error || "Não foi possível salvar o preço.");
        return;
      }

      await loadFlatPricingData(activeFlat.id);
      await revalidateFlatsCache().catch(() => null);

      const label =
        selectedDates.length === 1
          ? `Dia ${formatBrDate(selectedDates[0])} atualizado para ${formatCurrency(numericPrice)}!`
          : `${selectedDates.length} datas atualizadas para ${formatCurrency(numericPrice)}!`;

      setSuccessMsg(label);
    } finally {
      setIsSaving(false);
    }
  }

  // Restaurar o preço padrão nas datas selecionadas
  async function handleRestoreDefault(datesToRestore: string[]) {
    if (!activeFlat || datesToRestore.length === 0) return;

    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const pricingService = getBrowserPricingService();
      const result = await pricingService.removeDatesPrice(activeFlat.id, datesToRestore);

      if (!result.ok) {
        setError(result.error || "Não foi possível restaurar o preço padrão.");
        return;
      }

      await loadFlatPricingData(activeFlat.id);
      await revalidateFlatsCache().catch(() => null);

      setPriceInput(basePrice.toFixed(2).replace(".", ","));
      setSuccessMsg(
        datesToRestore.length === 1
          ? `Preço do dia ${formatBrDate(datesToRestore[0])} restaurado para o valor padrão (${formatCurrency(basePrice)}).`
          : `Preço padrão (${formatCurrency(basePrice)}) restaurado em ${datesToRestore.length} datas.`,
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleCopySql() {
    navigator.clipboard.writeText(PRICING_MIGRATION_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  }

  // Navegação rápida de mês/ano
  const currentYear = currentMonth.getFullYear();
  const currentMonthIdx = currentMonth.getMonth();
  const availableYears = useMemo(() => {
    const thisYear = new Date().getFullYear();
    return [thisYear - 1, thisYear, thisYear + 1, thisYear + 2, thisYear + 3];
  }, []);

  const monthNames = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];

  const selectedHasCustomPrice = useMemo(
    () => selectedDates.some((d) => datePricesMap[d] !== undefined),
    [selectedDates, datePricesMap],
  );

  return (
    <div className="flex flex-col gap-8">
      {/* Banner de aviso caso a tabela flat_date_prices ainda não tenha sido criada no Supabase */}
      {schemaMissing && (
        <div className="rounded-3xl border border-amber-300 bg-amber-50/90 p-6 shadow-xs dark:border-amber-800 dark:bg-amber-950/40">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-base font-bold text-amber-950 dark:text-amber-100">
                Ative a tabela de Preços Personalizados por Data no Supabase
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-amber-900/90 dark:text-amber-200/80">
                Para salvar preços diferentes em cada dia do calendário, copie o comando SQL abaixo e execute uma única vez no{" "}
                <strong>SQL Editor</strong> do seu painel Supabase:
              </p>
            </div>
            <Button
              variant="primary"
              leftIcon={copiedSql ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
              onClick={handleCopySql}
              className="shrink-0"
            >
              {copiedSql ? "SQL Copiado!" : "Copiar Script SQL"}
            </Button>
          </div>
          <pre className="mt-4 max-h-48 overflow-x-auto rounded-2xl bg-stone-950 p-4 text-[11px] text-stone-200">
            <code>{PRICING_MIGRATION_SQL}</code>
          </pre>
        </div>
      )}

      {/* Seletor de Flat */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 pb-4 dark:border-stone-800">
        <div className="flex flex-wrap items-center gap-2">
          {flats.map((flat) => {
            const isSelected = activeFlat?.id === flat.id;
            return (
              <button
                key={flat.id}
                type="button"
                onClick={() => setSelectedFlatId(flat.id)}
                className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  isSelected
                    ? "bg-stone-900 text-white shadow-xs dark:bg-amber-500 dark:text-stone-950"
                    : "bg-white text-stone-700 hover:bg-stone-100 dark:bg-stone-900 dark:text-stone-300 dark:hover:bg-stone-800"
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
                  Base: {formatCurrency(flat.preco_diaria)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Alternador de modo de seleção */}
        <div className="inline-flex items-center rounded-xl border border-stone-200 bg-white p-1 dark:border-stone-800 dark:bg-stone-900">
          <button
            type="button"
            onClick={() => {
              setSelectionMode("single");
              if (selectedDates.length > 1) {
                setSelectedDates([selectedDates[0]]);
              }
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectionMode === "single"
                ? "bg-amber-500 text-stone-950 shadow-2xs"
                : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
            }`}
          >
            Clicar em 1 Data
          </button>
          <button
            type="button"
            onClick={() => setSelectionMode("multiple")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              selectionMode === "multiple"
                ? "bg-amber-500 text-stone-950 shadow-2xs"
                : "text-stone-600 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200"
            }`}
          >
            Selecionar Várias Datas
          </button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {successMsg && <Alert variant="success">{successMsg}</Alert>}

      {/* Grid Principal: Calendário Interativo + Painel de Edição de Preço */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Coluna Esquerda: Calendário Mensal de Preços (8 colunas) */}
        <div className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-xs sm:p-6 lg:col-span-8 dark:border-stone-800 dark:bg-stone-900">
          {/* Barra de Navegação do Mês / Ano */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-4 dark:border-stone-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentMonth((prev) => subMonths(prev, 1))}
                className="inline-flex size-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                title="Mês anterior"
              >
                <ChevronLeftIcon className="size-4" />
              </button>

              <div className="flex items-center gap-1.5">
                <select
                  aria-label="Selecionar mês"
                  value={currentMonthIdx}
                  onChange={(e) =>
                    setCurrentMonth(new Date(currentYear, Number(e.target.value), 1))
                  }
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm font-bold text-stone-900 focus:border-amber-500 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                >
                  {monthNames.map((name, idx) => (
                    <option key={name} value={idx}>
                      {name}
                    </option>
                  ))}
                </select>

                <select
                  aria-label="Selecionar ano"
                  value={currentYear}
                  onChange={(e) =>
                    setCurrentMonth(new Date(Number(e.target.value), currentMonthIdx, 1))
                  }
                  className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-1.5 text-sm font-bold text-stone-900 focus:border-amber-500 focus:outline-none dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
                className="inline-flex size-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 transition hover:bg-stone-100 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
                title="Próximo mês"
              >
                <ChevronRightIcon className="size-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentMonth(startOfMonth(new Date()))}
                className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Mês Atual
              </button>
              {selectedDates.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDates([])}
                  className="rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-500 transition hover:bg-stone-100 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800"
                >
                  Limpar seleção ({selectedDates.length})
                </button>
              )}
            </div>
          </div>

          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
            {WEEKDAYS.map((dayName) => (
              <div key={dayName} className="py-1.5">
                {dayName}
              </div>
            ))}
          </div>

          {/* Grade de Dias do Mês */}
          <div className="relative grid grid-cols-7 gap-1.5 sm:gap-2">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/75 backdrop-blur-xs dark:bg-stone-900/75">
                <Spinner className="size-6 text-amber-600 dark:text-amber-400" />
                <span className="mt-2 text-xs font-medium text-stone-600 dark:text-stone-300">
                  Carregando tarifas do calendário...
                </span>
              </div>
            )}

            {calendarDays.map((day) => {
              const dateIso = format(day, "yyyy-MM-dd");
              const inCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedDates.includes(dateIso);
              const customPrice = datePricesMap[dateIso];
              const isCustom = typeof customPrice === "number" && Number.isFinite(customPrice);
              const effectivePrice = isCustom ? customPrice : basePrice;
              const occupied = isDateOccupied(dateIso);
              const todayHighlight = isToday(day);

              return (
                <button
                  key={dateIso}
                  type="button"
                  onClick={() => handleDayClick(day)}
                  className={`group relative flex min-h-18 flex-col justify-between rounded-2xl border p-2 text-left transition sm:min-h-21 sm:p-2.5 ${
                    !inCurrentMonth
                      ? "border-stone-100 bg-stone-50/40 opacity-45 hover:opacity-80 dark:border-stone-800/50 dark:bg-stone-950/30"
                      : isSelected
                        ? "border-amber-600 bg-amber-50/90 ring-2 ring-amber-500/50 dark:border-amber-400 dark:bg-amber-950/50"
                        : isCustom
                          ? "border-amber-300 bg-amber-50/40 hover:border-amber-400 dark:border-amber-800/80 dark:bg-amber-950/20"
                          : "border-stone-200/80 bg-white hover:border-stone-300 hover:bg-stone-50/60 dark:border-stone-800 dark:bg-stone-900 dark:hover:border-stone-700"
                  }`}
                >
                  {/* Topo da célula: Dia do mês + Indicador de Ocupado/Personalizado */}
                  <div className="flex w-full items-center justify-between gap-1">
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                        isSelected
                          ? "bg-amber-600 text-white dark:bg-amber-400 dark:text-stone-950"
                          : todayHighlight
                            ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                            : "text-stone-800 dark:text-stone-200"
                      }`}
                    >
                      {format(day, "d")}
                    </span>

                    {occupied ? (
                      <span
                        className="rounded-md bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700 dark:bg-red-950/70 dark:text-red-300"
                        title="Data com reserva ativa ou bloqueada"
                      >
                        Ocupado
                      </span>
                    ) : isCustom ? (
                      <span
                        className="size-2 rounded-full bg-amber-500"
                        title="Tarifa personalizada"
                      />
                    ) : null}
                  </div>

                  {/* Rodapé da célula: Preço da diária na data */}
                  <div className="mt-1 w-full truncate">
                    <p
                      className={`truncate text-[11px] leading-tight sm:text-xs ${
                        isCustom
                          ? "font-extrabold text-amber-700 dark:text-amber-400"
                          : "font-medium text-stone-500 dark:text-stone-400"
                      }`}
                    >
                      {formatCurrency(effectivePrice)}
                    </p>
                    {isCustom && (
                      <p className="hidden truncate text-[9px] font-semibold text-amber-600/90 sm:block dark:text-amber-300/80">
                        Personalizado
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-4 border-t border-stone-100 pt-3 text-xs text-stone-500 dark:border-stone-800 dark:text-stone-400">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-amber-500" />
                <strong className="text-stone-700 dark:text-stone-300">Tarifa Personalizada</strong>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full border border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-800" />
                <span>Tarifa Base ({formatCurrency(basePrice)})</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-red-400" />
                <span>Data Ocupada</span>
              </span>
            </div>
            <span>
              Dica: clique em qualquer dia para definir o valor exato daquela diária.
            </span>
          </div>
        </div>

        {/* Coluna Direita: Editor da(s) Data(s) Selecionada(s) (4 colunas) */}
        <div className="flex flex-col gap-5 lg:col-span-4">
          {/* Card de Edição de Preço */}
          <form
            onSubmit={handleSavePrice}
            className="flex flex-col gap-4 rounded-3xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="flex items-center gap-2.5 border-b border-stone-100 pb-3 dark:border-stone-800">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                <SparklesIcon className="size-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-50">
                  Personalizar Diária
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  {activeFlat?.titulo} • Padrão: {formatCurrency(basePrice)}
                </p>
              </div>
            </div>

            {selectedDates.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50/70 p-6 text-center dark:border-stone-800 dark:bg-stone-950/40">
                <CalendarIcon className="mx-auto size-7 text-stone-400" />
                <p className="mt-2 text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Nenhuma data selecionada
                </p>
                <p className="mt-1 text-[11px] leading-relaxed text-stone-500 dark:text-stone-400">
                  Clique em qualquer dia no calendário ao lado (ex.:{" "}
                  <strong>18/10/2026</strong> ou <strong>19/10/2026</strong>) para alterar o valor da diária.
                </p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl bg-amber-50/70 p-3.5 text-xs dark:bg-amber-950/30">
                  <span className="font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                    {selectedDates.length === 1
                      ? "Data Selecionada:"
                      : `${selectedDates.length} Datas Selecionadas:`}
                  </span>
                  <div className="mt-1.5 flex max-h-24 flex-wrap gap-1.5 overflow-y-auto">
                    {selectedDates.map((d) => (
                      <span
                        key={d}
                        className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-stone-900 shadow-2xs dark:bg-stone-900 dark:text-stone-100"
                      >
                        {formatBrDate(d)}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="custom-date-price-input"
                    className="block text-xs font-semibold text-stone-700 uppercase tracking-wider dark:text-stone-300"
                  >
                    Valor da diária para esta(s) data(s) (R$)
                  </label>
                  <div className="relative mt-1.5">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm font-bold text-stone-400">
                      R$
                    </span>
                    <input
                      ref={priceInputRef}
                      id="custom-date-price-input"
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: 1000,00"
                      value={priceInput}
                      onChange={(e) => setPriceInput(e.target.value)}
                      className="h-11 w-full rounded-xl border border-stone-300 bg-white pl-10 pr-4 text-base font-bold text-stone-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 focus:outline-none dark:border-stone-700 dark:bg-stone-950 dark:text-stone-50"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-stone-500 dark:text-stone-400">
                    Exemplos: digite <strong>1000,00</strong> para R$ 1.000,00 ou{" "}
                    <strong>500,00</strong> para R$ 500,00.
                  </p>
                </div>

                {/* Atalhos rápidos de valores */}
                <div className="flex flex-wrap gap-1.5">
                  {[300, 400, 500, 750, 1000, 1500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPriceInput(preset.toFixed(2).replace(".", ","))}
                      className="rounded-lg border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs font-semibold text-stone-700 transition hover:border-amber-400 hover:bg-amber-50 dark:border-stone-800 dark:bg-stone-800 dark:text-stone-300"
                    >
                      R$ {preset}
                    </button>
                  ))}
                </div>

                <div className="flex flex-col gap-2 pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    fullWidth
                    isLoading={isSaving}
                  >
                    Salvar Preço ({selectedDates.length}{" "}
                    {selectedDates.length === 1 ? "data" : "datas"})
                  </Button>

                  {selectedHasCustomPrice && (
                    <Button
                      type="button"
                      variant="outline"
                      fullWidth
                      disabled={isSaving}
                      onClick={() => handleRestoreDefault(selectedDates)}
                    >
                      Restaurar Preço Padrão ({formatCurrency(basePrice)})
                    </Button>
                  )}
                </div>
              </>
            )}
          </form>

          {/* Selecionar Intervalo Rápido (De -> Até) */}
          <div className="flex flex-col gap-3 rounded-3xl border border-stone-200 bg-white p-5 shadow-xs dark:border-stone-800 dark:bg-stone-900">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
              Selecionar Período / Feriado
            </h4>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Quer aplicar o mesmo preço em vários dias seguidos? Escolha o início e o fim abaixo:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
                  De:
                </label>
                <input
                  type="date"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-stone-600 dark:text-stone-400">
                  Até:
                </label>
                <input
                  type="date"
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs text-stone-900 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
                />
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleSelectInterval}
              className="w-full text-xs"
            >
              Selecionar Datas do Período
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de todas as datas com preços personalizados neste flat */}
      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-xs dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-4 dark:border-stone-800">
          <div>
            <h3 className="text-base font-bold text-stone-900 dark:text-stone-50">
              Datas com Tarifas Personalizadas ({customPricesList.length})
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Todas as datas abaixo possuem um preço específico que substitui a diária padrão de{" "}
              <strong>{formatCurrency(basePrice)}</strong> no {activeFlat?.titulo}.
            </p>
          </div>
        </div>

        {customPricesList.length === 0 ? (
          <p className="py-8 text-center text-xs text-stone-500 dark:text-stone-400">
            Nenhuma data com preço personalizado cadastrada para este flat ainda. Todas as datas estão usando o valor base de{" "}
            <strong>{formatCurrency(basePrice)}</strong>.
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {customPricesList.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-amber-200/80 bg-amber-50/40 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/20"
              >
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseISO(item.data);
                    setCurrentMonth(startOfMonth(parsed));
                    setSelectionMode("single");
                    setSelectedDates([item.data]);
                    setPriceInput(Number(item.preco).toFixed(2).replace(".", ","));
                    priceInputRef.current?.focus();
                  }}
                  className="text-left"
                >
                  <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                    {formatBrDate(item.data)}
                  </p>
                  <p className="text-sm font-extrabold text-amber-700 dark:text-amber-400">
                    {formatCurrency(item.preco)}
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleRestoreDefault([item.data])}
                  disabled={isSaving}
                  title="Remover preço personalizado e voltar ao padrão"
                  className="rounded-xl p-2 text-stone-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
