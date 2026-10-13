"use client";

import { DayPicker, type DateRange } from "react-day-picker";
import { ptBR } from "date-fns/locale";
import { startOfDay } from "date-fns";
import { Spinner } from "@/components/ui/Spinner";

interface ReservationCalendarProps {
  selectedRange?: DateRange;
  onSelectRange: (range: DateRange | undefined) => void;
  occupiedIntervals: Array<{ start: Date; end: Date }>;
  isLoading?: boolean;
  className?: string;
}

export function ReservationCalendar({
  selectedRange,
  onSelectRange,
  occupiedIntervals,
  isLoading = false,
  className = "",
}: ReservationCalendarProps) {
  const today = startOfDay(new Date());

  // Constrói lista de matchers de desabilitação:
  // 1. Dias no passado
  // 2. Intervalos ocupados: para cada reserva [start, end), desabilita dias entre start e end - 1
  const disabledMatchers = [
    { before: today },
    ...occupiedIntervals.map((interval) => ({
      from: interval.start,
      // end é o dia do checkout, que pode ser o checkin do próximo, portanto desabilita até o dia anterior
      to: new Date(interval.end.getTime() - 24 * 60 * 60 * 1000),
    })),
  ];

  return (
    <div className={`relative flex flex-col items-center rounded-2xl bg-white p-4 shadow-xs dark:bg-stone-900 ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/70 backdrop-blur-xs dark:bg-stone-900/70">
          <Spinner className="size-6 text-amber-600 dark:text-amber-400" />
          <span className="mt-2 text-xs font-medium text-stone-600 dark:text-stone-300">
            Atualizando datas disponíveis...
          </span>
        </div>
      )}

      <DayPicker
        mode="range"
        locale={ptBR}
        selected={selectedRange}
        onSelect={onSelectRange}
        disabled={disabledMatchers}
        numberOfMonths={1}
        className="text-stone-800 dark:text-stone-100"
      />

      {/* Legenda do calendário */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-4 border-t border-stone-100 pt-3 text-xs text-stone-600 dark:border-stone-800 dark:text-stone-400">
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full border border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-800" />
          <span>Disponível</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-amber-500" />
          <span>Selecionado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-3 rounded-full bg-stone-300 opacity-60 dark:bg-stone-700" />
          <span>Ocupado</span>
        </div>
      </div>
    </div>
  );
}
