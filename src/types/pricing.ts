export interface FlatDatePrice {
  id: string;
  flat_id: string;
  /** Data no formato ISO YYYY-MM-DD */
  data: string;
  /** Preço personalizado da diária para esta data */
  preco: number;
  created_at: string;
  updated_at: string;
}

/** Mapa de preços personalizados indexado por data ('YYYY-MM-DD' -> valor numérico) */
export type DatePriceMap = Record<string, number>;

export interface NightPriceBreakdown {
  /** Data da noite no formato 'YYYY-MM-DD' */
  date: string;
  /** Preço cobrado nessa noite */
  price: number;
  /** Indica se é um preço personalizado (true) ou o preço base do flat (false) */
  isCustom: boolean;
}
