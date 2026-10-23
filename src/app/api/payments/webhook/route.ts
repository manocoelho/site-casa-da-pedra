import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getMercadoPagoPayment } from "@/lib/mercadopago";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    let paymentId =
      searchParams.get("data.id") || searchParams.get("id") || null;

    let body: {
      id?: string | number;
      type?: string;
      topic?: string;
      data?: { id?: string | number };
    } | null = null;

    try {
      body = (await request.json()) as {
        id?: string | number;
        type?: string;
        topic?: string;
        data?: { id?: string | number };
      };
    } catch {
      body = null;
    }

    if (!paymentId && body) {
      if (body.data?.id) {
        paymentId = String(body.data.id);
      } else if (
        body.id &&
        (body.type === "payment" || body.topic === "payment")
      ) {
        paymentId = String(body.id);
      }
    }

    if (!paymentId) {
      return NextResponse.json({ received: true });
    }

    const mpInfo = await getMercadoPagoPayment(String(paymentId));
    if (!mpInfo || !mpInfo.externalReference) {
      return NextResponse.json({ received: true });
    }

    const reservationId = mpInfo.externalReference;
    const adminSupabase = createSupabaseAdminClient();

    if (mpInfo.status === "approved") {
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
    } else if (mpInfo.status === "rejected" || mpInfo.status === "cancelled") {
      const updateCancel = await adminSupabase
        .from("reservations")
        .update({
          status: "cancelada",
          status_pagamento: "recusado",
          mp_payment_id: mpInfo.id,
        })
        .eq("id", reservationId)
        .neq("status", "confirmada");

      if (updateCancel.error) {
        await adminSupabase
          .from("reservations")
          .update({ status: "cancelada" })
          .eq("id", reservationId)
          .neq("status", "confirmada");
      }
    } else if (mpInfo.status === "refunded") {
      await adminSupabase
        .from("reservations")
        .update({
          status: "cancelada",
          status_pagamento: "reembolsado",
          mp_payment_id: mpInfo.id,
        })
        .eq("id", reservationId);
    }

    return NextResponse.json({ received: true, status: mpInfo.status });
  } catch {
    return NextResponse.json({ received: true });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
