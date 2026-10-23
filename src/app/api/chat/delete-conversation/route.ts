import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Não autenticado." },
        { status: 401 },
      );
    }

    const adminSupabase = createSupabaseAdminClient();

    // Verifica se quem solicitou a exclusão é administrador
    const { data: callerProfile } = await adminSupabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (callerProfile?.role !== "admin") {
      return NextResponse.json(
        {
          ok: false,
          error: "Apenas administradores podem encerrar e excluir conversas.",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as { interlocutorId?: string };
    const interlocutorId = body.interlocutorId?.trim();

    if (!interlocutorId) {
      return NextResponse.json(
        { ok: false, error: "ID do cliente inválido." },
        { status: 400 },
      );
    }

    // Exclui definitivamente do banco todas as mensagens enviadas ou recebidas pelo cliente
    // (assim a conversa desaparece para TODOS os administradores em qualquer dispositivo)
    const { error: deleteError } = await adminSupabase
      .from("messages")
      .delete()
      .or(
        `sender_id.eq.${interlocutorId},receiver_id.eq.${interlocutorId}`,
      );

    if (deleteError) {
      return NextResponse.json(
        {
          ok: false,
          error: `Erro ao excluir conversa no banco: ${deleteError.message}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error:
          err instanceof Error
            ? err.message
            : "Erro interno ao excluir conversa.",
      },
      { status: 500 },
    );
  }
}
