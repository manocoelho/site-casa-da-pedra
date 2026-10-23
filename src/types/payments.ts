export type PaymentMethod = "pix" | "cartao";

export type PaymentStatus =
  | "pendente"
  | "aprovado"
  | "recusado"
  | "expirado"
  | "reembolsado";

export interface CreatePaymentRequest {
  flatId: string;
  dataInicio: string;
  dataFim: string;
  paymentMethod: PaymentMethod;
  /** CPF do titular (obrigatório para Pix no Mercado Pago) */
  payerCpf?: string;
}

export interface PixPaymentData {
  reservationId: string;
  paymentId: string;
  qrCode: string;
  qrCodeBase64: string;
  expiresAt: string;
  amount: number;
  discountAmount: number;
  originalAmount: number;
}

export interface CardCheckoutData {
  reservationId: string;
  preferenceId: string;
  checkoutUrl: string;
  amount: number;
  maxInstallments: number;
}

export interface CreatePaymentResponse {
  ok: boolean;
  paymentMethod?: PaymentMethod;
  pix?: PixPaymentData;
  card?: CardCheckoutData;
  error?: string;
}

export interface PaymentStatusResponse {
  ok: boolean;
  reservationId?: string;
  reservationStatus?: "pendente" | "confirmada" | "cancelada" | "concluida";
  paymentStatus?: PaymentStatus;
  isPaid?: boolean;
  isExpired?: boolean;
  error?: string;
}
