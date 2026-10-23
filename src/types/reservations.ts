import type { Reservation } from "./entities";

export interface OccupiedDateRange {
  data_inicio: string;
  data_fim: string;
}

export interface CreateReservationInput {
  flatId: string;
  dataInicio: string;
  dataFim: string;
  valorTotal?: number;
}

export interface ReservationOperationResult<T = Reservation> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface AdminReservation extends Reservation {
  flats?: {
    id: string;
    titulo: string;
    preco_diaria: number;
  } | null;
  users?: {
    id: string;
    nome: string | null;
    email: string | null;
  } | null;
}

export interface ClientReservation extends Reservation {
  flats?: {
    id: string;
    titulo: string;
    descricao?: string;
    preco_diaria: number;
    max_hospedes?: number;
    flat_photos?: Array<{
      id: string;
      url_imagem: string;
    }>;
  } | null;
}
