import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  findLatestMpPaymentByReference,
  getMercadoPagoPayment,
} from "@/lib/mercadopago";
import { notifyReservationConfirmedById } from "@/lib/email";
import type { PaymentStatus, PaymentStatusResponse } from "@/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reservationId = searchParams.get("reservation_id")?.trim();
    const queryPaymentId =
      searchParams.get("payment_id")?.trim() ||
      searchParams.get("collection_id")?.trim() ||
      null;

    if (!reservationId) {
      return NextResponse.json(
        {
          ok: false,
          error: "O parâmetro reservation_id é obrigatório.",
        } satisfies PaymentStatusResponse,
        { status: 400 },
      );
    }

    const adminSupabase = createSupabaseAdminClient();

    // Tenta buscar colunas completas (com campos de pagamento) e faz fallback caso a migration ainda não tenha sido rodada
    let reservation: {
      id: string;
      status: "pendente" | "confirmada" | "cancelada" | "concluida";
      status_pagamento?: PaymentStatus | null;
      mp_payment_id?: string | null;
      pix_expira_em?: string | null;
      created_at: string;
    } | null = null;

    const fullQuery = await adminSupabase
      .from("reservations")
      .select(
        "id, status, status_pagamento, mp_payment_id, pix_expira_em, created_at",
      )
      .eq("id", reservationId)
      .maybeSingle();

    if (!fullQuery.error && fullQuery.data) {
      reservation = fullQuery.data;
    } else {
      const basicQuery = await adminSupabase
        .from("reservations")
        .select("id, status, created_at")
        .eq("id", reservationId)
        .maybeSingle();

      if (basicQuery.error || !basicQuery.data) {
        return NextResponse.json(
          {
            ok: false,
            error: "Reserva não encontrada.",
          } satisfies PaymentStatusResponse,
          { status: 404 },
        );
      }
      reservation = basicQuery.data;
    }

    // Se já está confirmada no banco, retorna como paga imediatamente
    if (reservation.status === "confirmada" || reservation.status === "concluida") {
      return NextResponse.json({
        ok: true,
        reservationId: reservation.id,
        reservationStatus: reservation.status,
        paymentStatus: "aprovado",
        isPaid: true,
        isExpired: false,
      } satisfies PaymentStatusResponse);
    }

    // Consulta o status real no Mercado Pago (por payment_id ou external_reference)
    const targetPaymentId = queryPaymentId || reservation.mp_payment_id || null;
    let mpInfo = null;

    try {
      if (targetPaymentId) {
        mpInfo = await getMercadoPagoPayment(String(targetPaymentId));
      } else {
        mpInfo = await findLatestMpPaymentByReference(reservationId);
      }
    } catch {
      try {
        mpInfo = await findLatestMpPaymentByReference(reservationId);
      } catch {
        mpInfo = null;
      }
    }

    if (
      mpInfo &&
      (!mpInfo.externalReference || mpInfo.externalReference === reservationId)
    ) {
      if (mpInfo.status === "approved") {
        // Confirmação 100% automática no banco assim que o pagamento é aprovado
        const updateFull = await adminSupabase
          .from("reservations")
          .update({
            status: "confirmada",
            status_pagamento: "aprovado",
            mp_payment_id: mpInfo.id,
          })
          .eq("id", reservationId);

        if (updateFull.error) {
          await adminSupabase
            .from("reservations")
            .update({ status: "confirmada" })
            .eq("id", reservationId);
        }

        await notifyReservationConfirmedById(reservationId);

        return NextResponse.json({
          ok: true,
          reservationId,
          reservationStatus: "confirmada",
          paymentStatus: "aprovado",
          isPaid: true,
          isExpired: false,
        } satisfies PaymentStatusResponse);
      }

      if (mpInfo.status === "rejected" || mpInfo.status === "cancelled") {
        const isExpiredByTime = Boolean(
          reservation.pix_expira_em &&
            new Date(reservation.pix_expira_em).getTime() <= Date.now(),
        );
        const newPaymentStatus: PaymentStatus = isExpiredByTime
          ? "expirado"
          : "recusado";

        const updateCancel = await adminSupabase
          .from("reservations")
          .update({
            status: "cancelada",
            status_pagamento: newPaymentStatus,
            mp_payment_id: mpInfo.id,
          })
          .eq("id", reservationId);

        if (updateCancel.error) {
          await adminSupabase
            .from("reservations")
            .update({ status: "cancelada" })
            .eq("id", reservationId);
        }

        return NextResponse.json({
          ok: true,
          reservationId,
          reservationStatus: "cancelada",
          paymentStatus: newPaymentStatus,
          isPaid: false,
          isExpired: isExpiredByTime,
        } satisfies PaymentStatusResponse);
      }
    }

    // Verifica se o tempo limite de 30 minutos expirou sem pagamento
    const expiresAtMs = reservation.pix_expira_em
      ? new Date(reservation.pix_expira_em).getTime()
      : reservation.created_at
        ? new Date(reservation.created_at).getTime() + 30 * 60 * 1000
        : null;

    if (
      reservation.status === "pendente" &&
      expiresAtMs &&
      Date.now() >= expiresAtMs
    ) {
      const expUpdate = await adminSupabase
        .from("reservations")
        .update({
          status: "cancelada",
          status_pagamento: "expirado",
        })
        .eq("id", reservationId);

      if (expUpdate.error) {
        await adminSupabase
          .from("reservations")
          .update({ status: "cancelada" })
          .eq("id", reservationId);
      }

      return NextResponse.json({
        ok: true,
        reservationId,
        reservationStatus: "cancelada",
        paymentStatus: "expirado",
        isPaid: false,
        isExpired: true,
      } satisfies PaymentStatusResponse);
    }

    return NextResponse.json({
      ok: true,
      reservationId,
      reservationStatus: reservation.status,
      paymentStatus: reservation.status_pagamento || "pendente",
      isPaid: false,
      isExpired: reservation.status === "cancelada",
    } satisfies PaymentStatusResponse);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Erro ao verificar status do pagamento.",
      } satisfies PaymentStatusResponse,
      { status: 500 },
    );
  }
}
