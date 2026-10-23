import { NextResponse } from "next/server";
import { addDays, differenceInCalendarDays, format, parseISO, startOfDay } from "date-fns";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  cleanCpf,
  createMercadoPagoCardPreference,
  createMercadoPagoPixPayment,
  isValidCpf,
} from "@/lib/mercadopago";
import type { CreatePaymentRequest, CreatePaymentResponse } from "@/types";

function calculateStayTotal(
  dataInicio: string,
  dataFim: string,
  basePricePerNight: number,
  customPrices: Record<string, number>,
): { nights: number; total: number } {
  const start = startOfDay(parseISO(dataInicio));
  const end = startOfDay(parseISO(dataFim));
  const nights = differenceInCalendarDays(end, start);
  if (nights <= 0) return { nights: 0, total: 0 };

  let total = 0;
  for (let i = 0; i < nights; i++) {
    const dayStr = format(addDays(start, i), "yyyy-MM-dd");
    const custom = customPrices[dayStr];
    total +=
      typeof custom === "number" && Number.isFinite(custom)
        ? custom
        : basePricePerNight;
  }
  return { nights, total: Math.round(total * 100) / 100 };
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const adminSupabase = createSupabaseAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Você precisa estar conectado para realizar a reserva e o pagamento.",
        } satisfies CreatePaymentResponse,
        { status: 401 },
      );
    }

    const body = (await request.json()) as Partial<CreatePaymentRequest>;
    const flatId = body.flatId?.trim();
    const dataInicio = body.dataInicio?.trim();
    const dataFim = body.dataFim?.trim();
    const paymentMethod = body.paymentMethod;
    const payerCpf = body.payerCpf ? cleanCpf(body.payerCpf) : "";

    if (!flatId || !dataInicio || !dataFim || !paymentMethod) {
      return NextResponse.json(
        {
          ok: false,
          error: "Informe as datas de check-in, check-out e a forma de pagamento.",
        } satisfies CreatePaymentResponse,
        { status: 400 },
      );
    }

    if (paymentMethod !== "pix" && paymentMethod !== "cartao") {
      return NextResponse.json(
        {
          ok: false,
          error: "Forma de pagamento inválida.",
        } satisfies CreatePaymentResponse,
        { status: 400 },
      );
    }

    if (paymentMethod === "pix" && !isValidCpf(payerCpf)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Informe um CPF válido (11 dígitos) para gerar o QR Code do Pix.",
        } satisfies CreatePaymentResponse,
        { status: 400 },
      );
    }

    const today = new Date().toISOString().split("T")[0];
    if (dataInicio < today) {
      return NextResponse.json(
        {
          ok: false,
          error: "A data de check-in não pode ser no passado.",
        } satisfies CreatePaymentResponse,
        { status: 400 },
      );
    }

    if (dataFim <= dataInicio) {
      return NextResponse.json(
        {
          ok: false,
          error: "A data de check-out deve ser posterior ao check-in.",
        } satisfies CreatePaymentResponse,
        { status: 400 },
      );
    }

    // Expira reservas Pix pendentes que já passaram de 30 minutos
    try {
      await (adminSupabase as unknown as { rpc: (fn: string) => Promise<unknown> }).rpc(
        "expire_unpaid_reservations",
      );
    } catch {
      // Ignora caso a migration ainda não tenha sido executada
    }

    // Busca dados do flat
    const { data: flat, error: flatError } = await adminSupabase
      .from("flats")
      .select("id, titulo, preco_diaria, max_hospedes")
      .eq("id", flatId)
      .single();

    if (flatError || !flat) {
      return NextResponse.json(
        {
          ok: false,
          error: "Flat não encontrado.",
        } satisfies CreatePaymentResponse,
        { status: 404 },
      );
    }

    // Busca configurações editáveis de pagamento (desconto Pix e máximo de parcelas)
    let pixDiscountPercent = 10;
    let maxInstallments = 6;
    try {
      const untypedSettings = adminSupabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (col: string, val: number) => {
              maybeSingle: () => Promise<{
                data: {
                  pix_discount_percent?: number | null;
                  max_installments?: number | null;
                } | null;
              }>;
            };
          };
        };
      };
      const { data: settingsRow } = await untypedSettings
        .from("site_settings")
        .select("pix_discount_percent, max_installments")
        .eq("id", 1)
        .maybeSingle();

      if (settingsRow) {
        if (typeof settingsRow.pix_discount_percent === "number") {
          pixDiscountPercent = Number(settingsRow.pix_discount_percent);
        }
        if (typeof settingsRow.max_installments === "number") {
          maxInstallments = Number(settingsRow.max_installments);
        }
      }
    } catch {
      // Usa padrão 10% Pix e 6x Cartão
    }

    // Busca tarifas personalizadas por data
    const customPrices: Record<string, number> = {};
    try {
      const untypedPrices = adminSupabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (col: string, val: string) => {
              gte: (col2: string, val2: string) => {
                lt: (
                  col3: string,
                  val3: string,
                ) => Promise<{ data: Array<{ data: string; preco: number }> | null }>;
              };
            };
          };
        };
      };
      const { data: priceRows } = await untypedPrices
        .from("flat_date_prices")
        .select("data, preco")
        .eq("flat_id", flatId)
        .gte("data", dataInicio)
        .lt("data", dataFim);

      for (const row of priceRows || []) {
        if (row.data && Number.isFinite(Number(row.preco))) {
          customPrices[row.data] = Number(row.preco);
        }
      }
    } catch {
      // Ignora se tabela flat_date_prices não existir
    }

    const { nights, total: originalAmount } = calculateStayTotal(
      dataInicio,
      dataFim,
      Number(flat.preco_diaria),
      customPrices,
    );

    if (nights <= 0 || originalAmount <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: "Período selecionado inválido para cálculo da hospedagem.",
        } satisfies CreatePaymentResponse,
        { status: 400 },
      );
    }

    // Se o próprio usuário já tinha uma reserva pendente (não confirmada) para este mesmo flat e datas,
    // cancela a tentativa anterior para permitir trocar entre Pix/Cartão ou gerar novo QR Code sem bloquear a si mesmo
    await adminSupabase
      .from("reservations")
      .update({ status: "cancelada", status_pagamento: "expirado" })
      .eq("flat_id", flatId)
      .eq("user_id", user.id)
      .eq("status", "pendente")
      .eq("data_inicio", dataInicio)
      .eq("data_fim", dataFim);

    // Verifica se há conflito com bloqueios externos (Airbnb / Booking.com)
    try {
      const untypedBlocks = adminSupabase as unknown as {
        from: (t: string) => {
          select: (c: string) => {
            eq: (col: string, val: string) => {
              lt: (col2: string, val2: string) => {
                gt: (
                  col3: string,
                  val3: string,
                ) => Promise<{ data: Array<{ id: string }> | null }>;
              };
            };
          };
        };
      };
      const { data: extConflicts } = await untypedBlocks
        .from("external_calendar_blocks")
        .select("id")
        .eq("flat_id", flatId)
        .lt("data_inicio", dataFim)
        .gt("data_fim", dataInicio);

      if (extConflicts && extConflicts.length > 0) {
        return NextResponse.json(
          {
            ok: false,
            error:
              "O período selecionado já está reservado via Airbnb/Booking. Escolha outras datas.",
          } satisfies CreatePaymentResponse,
          { status: 409 },
        );
      }
    } catch {
      // Continua para verificação na tabela reservations
    }

    // Verifica conflito com outras reservas ativas
    const { data: conflictingReservations } = await adminSupabase
      .from("reservations")
      .select("id")
      .eq("flat_id", flatId)
      .in("status", ["pendente", "confirmada"])
      .lt("data_inicio", dataFim)
      .gt("data_fim", dataInicio);

    if (conflictingReservations && conflictingReservations.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "O período selecionado já está reservado ou aguardando pagamento de outro hóspede.",
        } satisfies CreatePaymentResponse,
        { status: 409 },
      );
    }

    const discountAmount =
      paymentMethod === "pix"
        ? Math.round(originalAmount * (pixDiscountPercent / 100) * 100) / 100
        : 0;

    const finalAmount = Math.max(
      1,
      Math.round((originalAmount - discountAmount) * 100) / 100,
    );

    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const expiresAtIso = expiresAt.toISOString();

    // Busca dados do usuário para enviar ao Mercado Pago
    const { data: profile } = await adminSupabase
      .from("users")
      .select("nome, email")
      .eq("id", user.id)
      .maybeSingle();

    const payerEmail =
      profile?.email || user.email || "hospede@casadapedra.com.br";
    const payerName =
      profile?.nome ||
      (typeof user.user_metadata?.nome === "string"
        ? user.user_metadata.nome
        : "Hospede Casa da Pedra");

    // Cria a reserva com status 'pendente' (pré-reserva de 30 minutos)
    let reservationId: string | null = null;

    const fullInsert = await adminSupabase
      .from("reservations")
      .insert({
        user_id: user.id,
        flat_id: flatId,
        data_inicio: dataInicio,
        data_fim: dataFim,
        status: "pendente",
        valor_total: finalAmount,
        valor_desconto: discountAmount,
        metodo_pagamento: paymentMethod,
        status_pagamento: "pendente",
        pix_expira_em: expiresAtIso,
      })
      .select("id")
      .single();

    if (!fullInsert.error && fullInsert.data?.id) {
      reservationId = fullInsert.data.id;
    } else {
      // Fallback caso a migration de colunas novas ainda não tenha sido executada no Supabase
      const basicInsert = await adminSupabase
        .from("reservations")
        .insert({
          user_id: user.id,
          flat_id: flatId,
          data_inicio: dataInicio,
          data_fim: dataFim,
          status: "pendente",
        })
        .select("id")
        .single();

      if (basicInsert.error || !basicInsert.data?.id) {
        return NextResponse.json(
          {
            ok: false,
            error:
              basicInsert.error?.message ||
              "Não foi possível registrar a pré-reserva para pagamento.",
          } satisfies CreatePaymentResponse,
          { status: 500 },
        );
      }
      reservationId = basicInsert.data.id;
    }

    const requestOrigin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://site-casa-da-pedra.vercel.app";

    const description = `Hospedagem ${flat.titulo} (${dataInicio} a ${dataFim} - ${nights} ${
      nights === 1 ? "noite" : "noites"
    })`;

    if (paymentMethod === "pix") {
      try {
        const pixResult = await createMercadoPagoPixPayment({
          reservationId,
          amount: finalAmount,
          description,
          payerEmail,
          payerName,
          payerCpf,
          expiresAt,
          siteOrigin: requestOrigin,
        });

        const isApproved = pixResult.status === "approved";

        // Salva dados do Pix na reserva
        await adminSupabase
          .from("reservations")
          .update({
            mp_payment_id: pixResult.paymentId,
            pix_qr_code: pixResult.qrCode,
            pix_qr_code_base64: pixResult.qrCodeBase64,
            pix_expira_em: expiresAtIso,
            status_pagamento: isApproved ? "aprovado" : "pendente",
            status: isApproved ? "confirmada" : "pendente",
          })
          .eq("id", reservationId);

        return NextResponse.json({
          ok: true,
          paymentMethod: "pix",
          pix: {
            reservationId,
            paymentId: pixResult.paymentId,
            qrCode: pixResult.qrCode,
            qrCodeBase64: pixResult.qrCodeBase64,
            expiresAt: expiresAtIso,
            amount: finalAmount,
            discountAmount,
            originalAmount,
          },
        } satisfies CreatePaymentResponse);
      } catch (mpErr) {
        // Remove a pré-reserva para não bloquear as datas se o Mercado Pago recusar a geração do QR Code
        await adminSupabase.from("reservations").delete().eq("id", reservationId);

        return NextResponse.json(
          {
            ok: false,
            error:
              mpErr instanceof Error
                ? mpErr.message
                : "Erro ao gerar QR Code Pix no Mercado Pago.",
          } satisfies CreatePaymentResponse,
          { status: 502 },
        );
      }
    } else {
      try {
        const cardPref = await createMercadoPagoCardPreference({
          reservationId,
          flatId,
          title: description,
          amount: finalAmount,
          maxInstallments,
          payerEmail,
          payerName,
          expiresAt,
          siteOrigin: requestOrigin,
        });

        await adminSupabase
          .from("reservations")
          .update({
            mp_preference_id: cardPref.preferenceId,
            metodo_pagamento: "cartao",
            status_pagamento: "pendente",
            pix_expira_em: expiresAtIso,
          })
          .eq("id", reservationId);

        return NextResponse.json({
          ok: true,
          paymentMethod: "cartao",
          card: {
            reservationId,
            preferenceId: cardPref.preferenceId,
            checkoutUrl: cardPref.initPoint,
            amount: finalAmount,
            maxInstallments,
          },
        } satisfies CreatePaymentResponse);
      } catch (mpErr) {
        await adminSupabase.from("reservations").delete().eq("id", reservationId);

        return NextResponse.json(
          {
            ok: false,
            error:
              mpErr instanceof Error
                ? mpErr.message
                : "Erro ao iniciar checkout de cartão de crédito no Mercado Pago.",
          } satisfies CreatePaymentResponse,
          { status: 502 },
        );
      }
    }
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Erro interno ao iniciar pagamento.",
      } satisfies CreatePaymentResponse,
      { status: 500 },
    );
  }
}
