import {
  createSupabaseBrowserClient,
  type TypedSupabaseClient,
} from "@/lib/supabase/client";
import type { UserProfile } from "@/types/entities";
import type {
  ChatConversation,
  ChatMessage,
  SendMessageResult,
} from "@/types/chat";

interface RpcConversationRow {
  interlocutor_id: string;
  interlocutor_nome: string;
  interlocutor_email: string;
  interlocutor_role: "admin" | "client";
  ultimo_conteudo: string;
  ultimo_timestamp: string;
}

export function createMessagesService(supabase: TypedSupabaseClient) {
  return {
    /**
     * Retorna o perfil de um administrador para servir de contato padrão aos clientes.
     */
    async getAdminContact(): Promise<UserProfile | null> {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();

      if (error) {
        console.warn("[messages] Erro ao buscar contato do admin:", error.message);
        return null;
      }

      return data;
    },

    /**
     * Retorna a lista de IDs de todos os administradores cadastrados.
     */
    async getAdminIds(): Promise<string[]> {
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .eq("role", "admin");

      if (error || !data) {
        return [];
      }

      return data.map((u) => u.id);
    },

    /**
     * Busca o histórico de mensagens entre o interlocutor e a administração.
     * Unifica a conversa para que qualquer administrador visualize o histórico completo do hóspede.
     */
    async listConversation(
      userId: string,
      receiverId: string,
    ): Promise<ChatMessage[]> {
      // 1. Tenta a função RPC unificada get_conversation_messages
      try {
        type RpcClient = {
          rpc: (
            fn: string,
            args: { p_interlocutor_id: string },
          ) => Promise<{ data: ChatMessage[] | null; error: unknown }>;
        };

        const { data: rpcData, error: rpcError } = await (
          supabase as unknown as RpcClient
        ).rpc("get_conversation_messages", { p_interlocutor_id: receiverId });

        if (!rpcError && Array.isArray(rpcData)) {
          return rpcData;
        }
      } catch (err) {
        console.warn("[messages] RPC get_conversation_messages indisponível, usando fallback:", err);
      }

      // 2. Fallback com verificação multi-admin:
      // Se um dos lados for admin, busca mensagens entre o cliente e qualquer admin
      try {
        const { data: adminUsers } = await supabase
          .from("users")
          .select("id")
          .eq("role", "admin");

        const adminIdSet = new Set((adminUsers || []).map((u) => u.id));
        const userIsAdmin = adminIdSet.has(userId);
        const receiverIsAdmin = adminIdSet.has(receiverId);

        if (userIsAdmin || receiverIsAdmin) {
          const clientId = userIsAdmin ? receiverId : userId;
          const adminIdList = Array.from(adminIdSet);

          if (adminIdList.length > 0) {
            const adminListStr = `(${adminIdList.join(",")})`;
            const { data, error } = await supabase
              .from("messages")
              .select("*")
              .or(
                `and(sender_id.eq.${clientId},receiver_id.in.${adminListStr}),and(receiver_id.eq.${clientId},sender_id.in.${adminListStr})`,
              )
              .order("timestamp", { ascending: true });

            if (!error && data) {
              return data;
            }
          }
        }
      } catch (err) {
        console.warn("[messages] Fallback multi-admin falhou, usando consulta padrão:", err);
      }

      // 3. Fallback clássico 1-para-1
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${userId})`,
        )
        .order("timestamp", { ascending: true });

      if (error) {
        console.error("[messages] Falha ao carregar conversa:", error.message);
        return [];
      }

      return data || [];
    },

    /**
     * Envia uma nova mensagem direta para o destinatário.
     */
    async sendMessage(
      senderId: string,
      receiverId: string,
      content: string,
    ): Promise<SendMessageResult> {
      const trimmed = content.trim();
      if (!trimmed) {
        return { ok: false, error: "A mensagem não pode ser vazia." };
      }

      if (trimmed.length > 5000) {
        return {
          ok: false,
          error: "A mensagem é muito longa (limite de 5000 caracteres).",
        };
      }

      if (senderId === receiverId) {
        return {
          ok: false,
          error: "Não é permitido enviar mensagem para você mesmo.",
        };
      }

      const { data, error } = await supabase
        .from("messages")
        .insert({
          sender_id: senderId,
          receiver_id: receiverId,
          conteudo: trimmed,
        })
        .select("*")
        .single();

      if (error) {
        return {
          ok: false,
          error: `Falha ao enviar mensagem: ${error.message}`,
        };
      }

      return {
        ok: true,
        data,
      };
    },

    /**
     * Lista todas as conversas recentes.
     * Para qualquer administrador, retorna a lista de todos os hóspedes que contataram a pousada.
     */
    async listConversations(userId: string): Promise<ChatConversation[]> {
      // 1. Tenta RPC get_user_conversations
      try {
        type RpcClient = {
          rpc: (
            fn: string,
          ) => Promise<{ data: RpcConversationRow[] | null; error: unknown }>;
        };

        const { data: rpcData, error: rpcError } = await (
          supabase as unknown as RpcClient
        ).rpc("get_user_conversations");

        if (!rpcError && Array.isArray(rpcData)) {
          return rpcData.map((row) => ({
            interlocutorId: row.interlocutor_id,
            interlocutorNome: row.interlocutor_nome,
            interlocutorEmail: row.interlocutor_email,
            interlocutorRole: row.interlocutor_role,
            ultimoConteudo: row.ultimo_conteudo,
            ultimoTimestamp: row.ultimo_timestamp,
          }));
        }
      } catch (err) {
        console.warn("[messages] RPC get_user_conversations indisponível, usando fallback:", err);
      }

      // 2. Fallback no cliente:
      // Verifica se o usuário atual é admin
      try {
        const { data: profile } = await supabase
          .from("users")
          .select("role")
          .eq("id", userId)
          .maybeSingle();

        const isAdmin = profile?.role === "admin";

        if (isAdmin) {
          // Busca todos os admins
          const { data: adminUsers } = await supabase
            .from("users")
            .select("id")
            .eq("role", "admin");

          const adminIdSet = new Set((adminUsers || []).map((u) => u.id));

          // Busca mensagens recentes
          const { data: msgs, error: msgsError } = await supabase
            .from("messages")
            .select("*")
            .order("timestamp", { ascending: false })
            .limit(200);

          if (!msgsError && msgs) {
            // Mapeia por client_id
            const clientLatestMap = new Map<
              string,
              { ultimoConteudo: string; ultimoTimestamp: string }
            >();

            for (const msg of msgs) {
              const otherId = adminIdSet.has(msg.sender_id) ? msg.receiver_id : msg.sender_id;
              if (!adminIdSet.has(otherId) && !clientLatestMap.has(otherId)) {
                clientLatestMap.set(otherId, {
                  ultimoConteudo: msg.conteudo,
                  ultimoTimestamp: msg.timestamp,
                });
              }
            }

            const clientIds = Array.from(clientLatestMap.keys());
            if (clientIds.length > 0) {
              const { data: clientProfiles } = await supabase
                .from("users")
                .select("id, nome, email, role")
                .in("id", clientIds);

              const profilesMap = new Map((clientProfiles || []).map((p) => [p.id, p]));

              return clientIds.map((cid) => {
                const p = profilesMap.get(cid);
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
          }
        }
      } catch (err) {
        console.warn("[messages] Fallback multi-admin de listConversations falhou:", err);
      }

      // 3. Fallback genérico padrão
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("timestamp", { ascending: false });

      if (error || !data) {
        return [];
      }

      const map = new Map<string, ChatConversation>();
      for (const msg of data) {
        const otherId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        if (!map.has(otherId)) {
          map.set(otherId, {
            interlocutorId: otherId,
            interlocutorNome: "Usuário",
            interlocutorRole: "client",
            ultimoConteudo: msg.conteudo,
            ultimoTimestamp: msg.timestamp,
          });
        }
      }

      return Array.from(map.values());
    },

    /**
     * Encerra e exclui todas as mensagens da conversa com um interlocutor (uso administrativo).
     */
    async deleteConversation(
      interlocutorId: string,
    ): Promise<{ ok: boolean; error?: string }> {
      if (!interlocutorId) {
        return { ok: false, error: "ID do contato inválido." };
      }

      // 1. Tenta via RPC SECURITY DEFINER (delete_conversation_messages)
      try {
        type RpcClient = {
          rpc: (
            fn: string,
            args: { p_interlocutor_id: string },
          ) => Promise<{ error: { message: string } | null }>;
        };

        const { error: rpcError } = await (
          supabase as unknown as RpcClient
        ).rpc("delete_conversation_messages", {
          p_interlocutor_id: interlocutorId,
        });

        if (!rpcError) {
          return { ok: true };
        }
      } catch {
        // Continua para fallback direto
      }

      // 2. Fallback: exclusão direta na tabela messages (requer policy DELETE para admin)
      const { error } = await supabase
        .from("messages")
        .delete()
        .or(`sender_id.eq.${interlocutorId},receiver_id.eq.${interlocutorId}`);

      if (error) {
        return {
          ok: false,
          error: `Não foi possível excluir as mensagens no banco: ${error.message}`,
        };
      }

      return { ok: true };
    },
  };
}

export type MessagesService = ReturnType<typeof createMessagesService>;

let browserMessagesService: MessagesService | null = null;

export function getBrowserMessagesService(): MessagesService {
  browserMessagesService ??= createMessagesService(createSupabaseBrowserClient());
  return browserMessagesService;
}
