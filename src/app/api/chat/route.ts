import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ChatConversation, ChatMessage } from "@/types/chat";
import type { UserProfile } from "@/types/entities";

const OWNER_DISPLAY_NAME = "Hemanoel Epitácio";

async function getAdminInfo(adminSupabase: ReturnType<typeof createSupabaseAdminClient>) {
  const { data: admins } = await adminSupabase
    .from("users")
    .select("*")
    .eq("role", "admin")
    .order("created_at", { ascending: true });

  const list = admins || [];
  const primaryOwner =
    list.find((u) => (u.nome || "").toLowerCase().includes("hemanoel")) ||
    list[0] ||
    null;

  const adminIds = list.map((u) => u.id);
  const adminIdSet = new Set(adminIds);

  const adminContact: UserProfile | null = primaryOwner
    ? {
        ...primaryOwner,
        nome: OWNER_DISPLAY_NAME,
      }
    : null;

  return {
    adminContact,
    primaryAdminId: primaryOwner?.id || null,
    adminIds,
    adminIdSet,
  };
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: "Não autenticado." }, { status: 401 });
    }

    const adminSupabase = createSupabaseAdminClient();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "init";

    const { data: callerProfile } = await adminSupabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const isCallerAdmin = callerProfile?.role === "admin";
    const { adminContact, adminIds, adminIdSet } = await getAdminInfo(adminSupabase);

    // 1. Buscar histórico de mensagens de uma conversa
    if (action === "messages") {
      const interlocutorId = searchParams.get("interlocutorId")?.trim();
      if (!interlocutorId) {
        return NextResponse.json({ ok: true, messages: [] });
      }

      if (isCallerAdmin) {
        // Admin lendo conversa com um cliente: retorna TODAS as mensagens entre o cliente e QUALQUER admin
        const { data: allClientMsgs, error } = await adminSupabase
          .from("messages")
          .select("*")
          .or(`sender_id.eq.${interlocutorId},receiver_id.eq.${interlocutorId}`)
          .order("timestamp", { ascending: true });

        if (error || !allClientMsgs) {
          return NextResponse.json({ ok: true, messages: [] });
        }

        const filtered = allClientMsgs.filter(
          (m) =>
            (m.sender_id === interlocutorId && adminIdSet.has(m.receiver_id)) ||
            (m.receiver_id === interlocutorId && adminIdSet.has(m.sender_id)),
        );

        return NextResponse.json({ ok: true, messages: filtered });
      } else {
        // Cliente lendo conversa com a administração: retorna TODAS as mensagens dele com QUALQUER admin
        const { data: allUserMsgs, error } = await adminSupabase
          .from("messages")
          .select("*")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order("timestamp", { ascending: true });

        if (error || !allUserMsgs) {
          return NextResponse.json({ ok: true, messages: [] });
        }

        const filtered = allUserMsgs.filter(
          (m) =>
            (m.sender_id === user.id &&
              (adminIdSet.has(m.receiver_id) || m.receiver_id === interlocutorId)) ||
            (m.receiver_id === user.id &&
              (adminIdSet.has(m.sender_id) || m.sender_id === interlocutorId)),
        );

        return NextResponse.json({ ok: true, messages: filtered });
      }
    }

    // 2. Listar conversas (para a barra lateral)
    let conversations: ChatConversation[] = [];

    if (isCallerAdmin) {
      // Todos os administradores enxergam exatamente a mesma lista de clientes atendidos
      const { data: allMsgs } = await adminSupabase
        .from("messages")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(500);

      const clientLatestMap = new Map<
        string,
        { ultimoConteudo: string; ultimoTimestamp: string }
      >();

      for (const msg of allMsgs || []) {
        const senderIsAdmin = adminIdSet.has(msg.sender_id);
        const receiverIsAdmin = adminIdSet.has(msg.receiver_id);

        if (!senderIsAdmin && !receiverIsAdmin) continue;
        if (senderIsAdmin && receiverIsAdmin) continue;

        const clientId = senderIsAdmin ? msg.receiver_id : msg.sender_id;
        if (!clientLatestMap.has(clientId)) {
          clientLatestMap.set(clientId, {
            ultimoConteudo: msg.conteudo,
            ultimoTimestamp: msg.timestamp,
          });
        }
      }

      const clientIds = Array.from(clientLatestMap.keys());
      if (clientIds.length > 0) {
        const { data: profiles } = await adminSupabase
          .from("users")
          .select("id, nome, email, role")
          .in("id", clientIds);

        const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

        conversations = clientIds.map((cid) => {
          const p = profileMap.get(cid);
          const latest = clientLatestMap.get(cid);
          return {
            interlocutorId: cid,
            interlocutorNome: p?.nome || "Hóspede",
            interlocutorEmail: p?.email || undefined,
            interlocutorRole: "client" as const,
            ultimoConteudo: latest?.ultimoConteudo,
            ultimoTimestamp: latest?.ultimoTimestamp,
          };
        });
      }
    } else {
      // Cliente: enxerga SEMPRE uma única aba unificada com o Dono (Hemanoel Epitácio),
      // independentemente de qual administrador respondeu
      const { data: userMsgs } = await adminSupabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("timestamp", { ascending: false })
        .limit(100);

      const latestAdminMsg = (userMsgs || []).find(
        (m) => adminIdSet.has(m.sender_id) || adminIdSet.has(m.receiver_id),
      );

      if (latestAdminMsg && adminContact) {
        conversations = [
          {
            interlocutorId: adminContact.id,
            interlocutorNome: OWNER_DISPLAY_NAME,
            interlocutorEmail: adminContact.email || undefined,
            interlocutorRole: "admin",
            ultimoConteudo: latestAdminMsg.conteudo,
            ultimoTimestamp: latestAdminMsg.timestamp,
          },
        ];
      }
    }

    return NextResponse.json({
      ok: true,
      adminContact,
      adminIds,
      conversations,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro ao carregar chat.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { ok: false, error: "Você precisa estar conectado para enviar mensagens." },
        { status: 401 },
      );
    }

    const body = (await request.json()) as {
      receiverId?: string;
      content?: string;
    };
    const rawReceiverId = body.receiverId?.trim();
    const content = body.content?.trim();

    if (!rawReceiverId || !content) {
      return NextResponse.json(
        { ok: false, error: "Destinatário e mensagem são obrigatórios." },
        { status: 400 },
      );
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { ok: false, error: "Mensagem muito longa (máximo 5000 caracteres)." },
        { status: 400 },
      );
    }

    const adminSupabase = createSupabaseAdminClient();
    const { data: callerProfile } = await adminSupabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const isCallerAdmin = callerProfile?.role === "admin";
    const { primaryAdminId, adminIdSet } = await getAdminInfo(adminSupabase);

    // Se quem envia é um Admin respondendo a um cliente, grava usando o ID principal do Dono
    // para que o banco mantenha uma única conversa unificada entre todos os admins e o cliente.
    const effectiveSenderId =
      isCallerAdmin && primaryAdminId ? primaryAdminId : user.id;

    // Se quem envia é um Cliente mandando mensagem para qualquer admin, direciona para o ID principal do Dono
    const effectiveReceiverId =
      !isCallerAdmin && adminIdSet.has(rawReceiverId) && primaryAdminId
        ? primaryAdminId
        : rawReceiverId;

    const { data: inserted, error: insertError } = await adminSupabase
      .from("messages")
      .insert({
        sender_id: effectiveSenderId,
        receiver_id: effectiveReceiverId,
        conteudo: content,
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      return NextResponse.json(
        {
          ok: false,
          error: insertError?.message || "Não foi possível enviar a mensagem.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: inserted satisfies ChatMessage,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Erro interno ao enviar mensagem.",
      },
      { status: 500 },
    );
  }
}
