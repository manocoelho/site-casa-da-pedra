import type { Reservation } from "./entities";

export interface OccupiedDateRange {
  data_inicio: string;
  data_fim: string;
}

export interface CreateReservationInput {
  flatId: string;
  dataInicio: string;
  dataFim: string;
}

export interface ReservationOperationResult<T = Reservation> {
  ok: boolean;
  data?: T;
  error?: string;
}
