import "server-only";

const MP_API_BASE = "https://api.mercadopago.com";

function getAccessToken(): string {
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "Variável MERCADO_PAGO_ACCESS_TOKEN não configurada no servidor.",
    );
  }
  return token;
}

export function cleanCpf(raw?: string): string {
  return (raw || "").replace(/\D/g, "");
}

export function isValidCpf(raw?: string): boolean {
  const cpf = cleanCpf(raw);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(cpf[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(cpf[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === Number(cpf[10]);
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "Hospede", lastName: "Casa da Pedra" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "Hospede" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

/**
 * Formata uma data para o padrão ISO 8601 exigido pelo Mercado Pago:
 * yyyy-MM-dd'T'HH:mm:ss.SSS-03:00 (ou Z)
 */
function formatMpExpirationDate(date: Date): string {
  return date.toISOString();
}

export interface CreateMpPixInput {
  reservationId: string;
  amount: number;
  description: string;
  payerEmail: string;
  payerName: string;
  payerCpf: string;
  expiresAt: Date;
  siteOrigin: string;
}

export interface MpPixResult {
  paymentId: string;
  status: string;
  qrCode: string;
  qrCodeBase64: string;
}

export async function createMercadoPagoPixPayment(
  input: CreateMpPixInput,
): Promise<MpPixResult> {
  const accessToken = getAccessToken();
  const { firstName, lastName } = splitFullName(input.payerName);
  const cpf = cleanCpf(input.payerCpf);

  const isHttpsOrigin = input.siteOrigin.startsWith("https://");
  const notificationUrl = isHttpsOrigin
    ? `${input.siteOrigin}/api/payments/webhook`
    : undefined;

  const payload: Record<string, unknown> = {
    transaction_amount: Number(input.amount.toFixed(2)),
    description: input.description,
    payment_method_id: "pix",
    external_reference: input.reservationId,
    date_of_expiration: formatMpExpirationDate(input.expiresAt),
    payer: {
      email: input.payerEmail || "hospede@casadapedra.com.br",
      first_name: firstName,
      last_name: lastName,
      identification: {
        type: "CPF",
        number: cpf,
      },
    },
  };

  if (notificationUrl) {
    payload.notification_url = notificationUrl;
  }

  const response = await fetch(`${MP_API_BASE}/v1/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": `pix-${input.reservationId}-${Date.now()}`,
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as {
    id?: number | string;
    status?: string;
    message?: string;
    cause?: Array<{ code?: number | string; description?: string }>;
    point_of_interaction?: {
      transaction_data?: {
        qr_code?: string;
        qr_code_base64?: string;
      };
    };
  };

  if (!response.ok || !data.id) {
    const causeMsg = data.cause
      ?.map((c) => c.description)
      .filter(Boolean)
      .join(", ");
    throw new Error(
      causeMsg ||
        data.message ||
        "Não foi possível gerar o QR Code Pix no Mercado Pago. Verifique se há uma chave Pix cadastrada na conta Mercado Pago.",
    );
  }

  const txData = data.point_of_interaction?.transaction_data;
  const qrCode = txData?.qr_code || "";
  const qrCodeBase64 = txData?.qr_code_base64 || "";

  if (!qrCode) {
    throw new Error(
      "O Mercado Pago não retornou o código Pix. Certifique-se de que a conta Mercado Pago possui uma chave Pix ativa.",
    );
  }

  return {
    paymentId: String(data.id),
    status: data.status || "pending",
    qrCode,
    qrCodeBase64,
  };
}

export interface CreateMpCardPreferenceInput {
  reservationId: string;
  flatId: string;
  title: string;
  amount: number;
  maxInstallments: number;
  payerEmail: string;
  payerName: string;
  expiresAt: Date;
  siteOrigin: string;
}

export interface MpCardPreferenceResult {
  preferenceId: string;
  initPoint: string;
}

export async function createMercadoPagoCardPreference(
  input: CreateMpCardPreferenceInput,
): Promise<MpCardPreferenceResult> {
  const accessToken = getAccessToken();
  const { firstName, lastName } = splitFullName(input.payerName);
  const isHttpsOrigin = input.siteOrigin.startsWith("https://");

  const returnBase = `${input.siteOrigin}/flats/${input.flatId}`;
  const backUrls = {
    success: `${returnBase}?payment=success&reservation_id=${input.reservationId}`,
    pending: `${returnBase}?payment=pending&reservation_id=${input.reservationId}`,
    failure: `${returnBase}?payment=failure&reservation_id=${input.reservationId}`,
  };

  const payload: Record<string, unknown> = {
    items: [
      {
        id: input.flatId,
        title: input.title,
        quantity: 1,
        currency_id: "BRL",
        unit_price: Number(input.amount.toFixed(2)),
      },
    ],
    payer: {
      name: firstName,
      surname: lastName,
      email: input.payerEmail || "hospede@casadapedra.com.br",
    },
    payment_methods: {
      excluded_payment_types: [{ id: "ticket" }, { id: "bank_transfer" }],
      installments: Math.max(1, Math.min(12, input.maxInstallments || 6)),
    },
    external_reference: input.reservationId,
    back_urls: backUrls,
    expires: true,
    expiration_date_from: new Date().toISOString(),
    expiration_date_to: formatMpExpirationDate(input.expiresAt),
    statement_descriptor: "CASA DA PEDRA",
  };

  if (isHttpsOrigin) {
    payload.auto_return = "approved";
    payload.notification_url = `${input.siteOrigin}/api/payments/webhook`;
  }

  const response = await fetch(`${MP_API_BASE}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as {
    id?: string;
    init_point?: string;
    sandbox_init_point?: string;
    message?: string;
  };

  if (!response.ok || !data.id || !data.init_point) {
    throw new Error(
      data.message ||
        "Não foi possível iniciar o checkout de cartão no Mercado Pago.",
    );
  }

  return {
    preferenceId: data.id,
    initPoint: data.init_point,
  };
}

export interface MpPaymentInfo {
  id: string;
  status: string; // 'approved' | 'pending' | 'in_process' | 'rejected' | 'cancelled' | 'refunded'
  externalReference: string | null;
  paymentTypeId?: string;
  transactionAmount?: number;
}

export async function getMercadoPagoPayment(
  paymentId: string,
): Promise<MpPaymentInfo | null> {
  const accessToken = getAccessToken();

  const response = await fetch(
    `${MP_API_BASE}/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) return null;

  const data = (await response.json()) as {
    id?: number | string;
    status?: string;
    external_reference?: string;
    payment_type_id?: string;
    transaction_amount?: number;
  };

  if (!data?.id) return null;

  return {
    id: String(data.id),
    status: data.status || "pending",
    externalReference: data.external_reference || null,
    paymentTypeId: data.payment_type_id,
    transactionAmount: data.transaction_amount,
  };
}

export async function findLatestMpPaymentByReference(
  reservationId: string,
): Promise<MpPaymentInfo | null> {
  const accessToken = getAccessToken();
  const url = `${MP_API_BASE}/v1/payments/search?external_reference=${encodeURIComponent(
    reservationId,
  )}&sort=date_created&criteria=desc&limit=5`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    results?: Array<{
      id?: number | string;
      status?: string;
      external_reference?: string;
      payment_type_id?: string;
      transaction_amount?: number;
    }>;
  };

  const results = data.results || [];
  if (results.length === 0) return null;

  // Prioriza pagamento aprovado se existir
  const approved = results.find((r) => r.status === "approved") || results[0];
  if (!approved?.id) return null;

  return {
    id: String(approved.id),
    status: approved.status || "pending",
    externalReference: approved.external_reference || null,
    paymentTypeId: approved.payment_type_id,
    transactionAmount: approved.transaction_amount,
  };
}
