import "server-only";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { formatCurrency } from "@/lib/format";

export interface ReservationEmailInput {
  reservationId: string;
  userId: string;
  guestName: string;
  guestEmail: string;
  flatTitle: string;
  dataInicio: string;
  dataFim: string;
  amount: number;
  discountAmount?: number;
  paymentMethod: "pix" | "cartao";
  status: "pendente" | "confirmada";
  pixQrCode?: string;
  siteOrigin?: string;
}

function formatDatePt(isoDate: string): string {
  try {
    return format(parseISO(isoDate), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return isoDate;
  }
}

function buildReservationEmailHtml(input: ReservationEmailInput): {
  subject: string;
  html: string;
} {
  const shortCode = input.reservationId.slice(0, 8).toUpperCase();
  const checkInFormatted = formatDatePt(input.dataInicio);
  const checkOutFormatted = formatDatePt(input.dataFim);
  const nights = Math.max(
    1,
    differenceInCalendarDays(
      parseISO(input.dataFim),
      parseISO(input.dataInicio),
    ),
  );
  const isConfirmed = input.status === "confirmada";
  const siteUrl =
    input.siteOrigin ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "https://site-casa-da-pedra.vercel.app";
  const myReservationsUrl = `${siteUrl}/minhas-reservas`;

  const subject = isConfirmed
    ? `✅ Reserva Confirmada (#${shortCode}) — ${input.flatTitle} | Casa da Pedra`
    : `⏳ Solicitação de Reserva (#${shortCode}) — ${input.flatTitle} | Casa da Pedra`;

  const statusBadgeHtml = isConfirmed
    ? `<span style="display:inline-block;background-color:#059669;color:#ffffff;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.05em;">CONFIRMADA E PAGA</span>`
    : `<span style="display:inline-block;background-color:#d97706;color:#ffffff;padding:6px 14px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.05em;">AGUARDANDO PAGAMENTO</span>`;

  const pixSectionHtml =
    !isConfirmed && input.paymentMethod === "pix" && input.pixQrCode
      ? `
      <div style="margin-top:20px;padding:16px;background-color:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#065f46;">Código Pix Copia e Cola (Expira em 30 minutos):</p>
        <p style="margin:0;padding:10px;background-color:#ffffff;border:1px solid #d1fae5;border-radius:8px;font-family:monospace;font-size:11px;word-break:break-all;color:#1f2937;">${input.pixQrCode}</p>
      </div>`
      : "";

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
</head>
<body style="margin:0;padding:24px;background-color:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1c1917;">
  <div style="max-width:580px;margin:0 auto;background-color:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e7e5e4;">
    <div style="background-color:#1c1917;padding:28px 32px;text-align:center;">
      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.2em;color:#fbbf24;font-weight:600;">Bananeiras · Paraíba</p>
      <h1 style="margin:6px 0 0;font-size:24px;color:#ffffff;font-weight:800;">Casa da Pedra</h1>
    </div>

    <div style="padding:32px;">
      <div style="margin-bottom:20px;">
        ${statusBadgeHtml}
      </div>

      <h2 style="margin:0 0 8px;font-size:20px;color:#1c1917;">Olá, ${input.guestName}!</h2>
      <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#57534e;">
        ${
          isConfirmed
            ? `Seu pagamento foi aprovado e sua hospedagem no <strong>${input.flatTitle}</strong> já está 100% confirmada em nosso calendário.`
            : `Recebemos seu pedido de reserva para o <strong>${input.flatTitle}</strong>. Assim que o pagamento for concluído, sua reserva será confirmada automaticamente.`
        }
      </p>

      <div style="background-color:#fafaf9;border:1px solid #e7e5e4;border-radius:14px;padding:20px;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#78716c;">Dados da Reserva #${shortCode}</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <tr>
            <td style="padding:6px 0;color:#57534e;">Acomodação:</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;color:#1c1917;">${input.flatTitle}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#57534e;">Check-in (a partir das 14h):</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;color:#1c1917;">${checkInFormatted}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#57534e;">Check-out (até as 12h):</td>
            <td style="padding:6px 0;text-align:right;font-weight:700;color:#1c1917;">${checkOutFormatted}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#57534e;">Duração:</td>
            <td style="padding:6px 0;text-align:right;font-weight:600;color:#1c1917;">${nights} ${nights === 1 ? "noite" : "noites"}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#57534e;">Forma de pagamento:</td>
            <td style="padding:6px 0;text-align:right;font-weight:600;color:#1c1917;">${input.paymentMethod === "pix" ? "Pix" : "Cartão de Crédito"}</td>
          </tr>
          ${
            input.discountAmount && input.discountAmount > 0
              ? `<tr>
                  <td style="padding:6px 0;color:#059669;">Desconto Pix aplicado:</td>
                  <td style="padding:6px 0;text-align:right;font-weight:600;color:#059669;">- ${formatCurrency(input.discountAmount)}</td>
                </tr>`
              : ""
          }
          <tr style="border-top:1px solid #e7e5e4;">
            <td style="padding:12px 0 4px;font-weight:700;color:#1c1917;font-size:15px;">Valor Total:</td>
            <td style="padding:12px 0 4px;text-align:right;font-weight:800;color:#059669;font-size:16px;">${formatCurrency(input.amount)}</td>
          </tr>
        </table>
      </div>

      ${pixSectionHtml}

      <div style="margin-top:20px;padding:14px 16px;background-color:#fffbeb;border:1px solid #fde68a;border-radius:12px;font-size:13px;color:#78350f;">
        <strong>📍 Endereço:</strong> R. Antonio Maia, 54 · Bananeiras, Paraíba<br/>
        <strong>🛡️ Cancelamento:</strong> Gratuito com reembolso integral (100%) em até 48h após a compra.
      </div>

      <div style="margin-top:28px;text-align:center;">
        <a href="${myReservationsUrl}" style="display:inline-block;background-color:#1c1917;color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:14px;font-weight:700;">
          Acompanhar em Minhas Reservas
        </a>
      </div>
    </div>

    <div style="background-color:#fafaf9;padding:18px 32px;text-align:center;border-top:1px solid #e7e5e4;font-size:12px;color:#78716c;">
      Casa da Pedra — Bananeiras, PB · Este é um e-mail automático com os detalhes da sua reserva.
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

/**
 * Envia o e-mail com os dados da reserva para o cliente (caso RESEND_API_KEY esteja configurada)
 * e também registra uma mensagem automática no Chat interno do site para o cliente acompanhar.
 */
export async function sendReservationNotification(
  input: ReservationEmailInput,
): Promise<void> {
  // 1. Envia mensagem automática no Chat interno da plataforma (Anfitrião -> Hóspede)
  try {
    const adminSupabase = createSupabaseAdminClient();
    const { data: adminUser } = await adminSupabase
      .from("users")
      .select("id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

    if (adminUser?.id && adminUser.id !== input.userId) {
      const shortCode = input.reservationId.slice(0, 8).toUpperCase();
      const checkInFormatted = formatDatePt(input.dataInicio);
      const checkOutFormatted = formatDatePt(input.dataFim);
      const nights = Math.max(
        1,
        differenceInCalendarDays(
          parseISO(input.dataFim),
          parseISO(input.dataInicio),
        ),
      );

      const chatText =
        input.status === "confirmada"
          ? `✅ Olá, ${input.guestName}! Sua reserva #${shortCode} para o ${input.flatTitle} (${checkInFormatted} a ${checkOutFormatted} — ${nights} ${nights === 1 ? "noite" : "noites"}) foi CONFIRMADA! Valor pago: ${formatCurrency(input.amount)} (${input.paymentMethod === "pix" ? "Pix" : "Cartão"}). Você pode acompanhar todos os detalhes na aba "Minhas Reservas". Qualquer dúvida, estamos à disposição por aqui!`
          : `⏳ Olá, ${input.guestName}! Recebemos seu pedido de reserva #${shortCode} para o ${input.flatTitle} (${checkInFormatted} a ${checkOutFormatted} — ${nights} ${nights === 1 ? "noite" : "noites"}), no valor de ${formatCurrency(input.amount)}. Assim que o pagamento for confirmado, sua estadia será aprovada automaticamente. Você pode acompanhar tudo na aba "Minhas Reservas"!`;

      await adminSupabase.from("messages").insert({
        sender_id: adminUser.id,
        receiver_id: input.userId,
        conteudo: chatText,
      });
    }
  } catch {
    // Não interrompe o fluxo caso o envio da mensagem no chat falhe
  }

  // 2. Envia e-mail transacional com o resumo completo da reserva (se RESEND_API_KEY estiver configurada)
  const resendApiKey = process.env.RESEND_API_KEY?.trim();
  if (!resendApiKey || !input.guestEmail || !input.guestEmail.includes("@")) {
    return;
  }

  try {
    const { subject, html } = buildReservationEmailHtml(input);
    const fromAddress =
      process.env.RESEND_FROM_EMAIL?.trim() ||
      "Casa da Pedra <onboarding@resend.dev>";

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [input.guestEmail],
        subject,
        html,
      }),
    });
  } catch (err) {
    console.warn("[email] Falha ao enviar e-mail da reserva:", err);
  }
}

/**
 * Busca os dados de uma reserva recém-confirmada pelo ID e envia o e-mail + mensagem no Chat.
 */
export async function notifyReservationConfirmedById(
  reservationId: string,
): Promise<void> {
  try {
    const adminSupabase = createSupabaseAdminClient();
    const { data: r } = await adminSupabase
      .from("reservations")
      .select(
        "id, user_id, flat_id, data_inicio, data_fim, valor_total, valor_desconto, metodo_pagamento, flats(titulo, preco_diaria), users(nome, email)",
      )
      .eq("id", reservationId)
      .maybeSingle();

    if (!r) return;

    const row = r as unknown as {
      id: string;
      user_id: string;
      data_inicio: string;
      data_fim: string;
      valor_total?: number | null;
      valor_desconto?: number | null;
      metodo_pagamento?: "pix" | "cartao" | null;
      flats?: { titulo?: string; preco_diaria?: number } | null;
      users?: { nome?: string | null; email?: string | null } | null;
    };

    const nights = Math.max(
      1,
      differenceInCalendarDays(
        parseISO(row.data_inicio ? row.data_fim : ""),
        parseISO(row.data_inicio || ""),
      ),
    );
    const fallbackTotal = nights * (Number(row.flats?.preco_diaria) || 0);

    await sendReservationNotification({
      reservationId: row.id,
      userId: row.user_id,
      guestName: row.users?.nome || "Hóspede",
      guestEmail: row.users?.email || "",
      flatTitle: row.flats?.titulo || "Flat Casa da Pedra",
      dataInicio: row.data_inicio,
      dataFim: row.data_fim,
      amount:
        typeof row.valor_total === "number" && row.valor_total > 0
          ? Number(row.valor_total)
          : fallbackTotal,
      discountAmount: Number(row.valor_desconto) || 0,
      paymentMethod: row.metodo_pagamento === "cartao" ? "cartao" : "pix",
      status: "confirmada",
    });
  } catch {
    // Ignora falhas silenciosamente para não impactar a confirmação
  }
}
