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
     * Retorna o perfil do administrador/dono da Casa da Pedra.
     * Permitido para qualquer usuário autenticado pela policy RLS.
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
     * Busca o histórico de mensagens entre dois usuários ordenado cronologicamente.
     */
    async listConversation(
      userId: string,
      receiverId: string,
    ): Promise<ChatMessage[]> {
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
     * Lista todas as conversas recentes do usuário com o resumo da última mensagem.
     */
    async listConversations(userId: string): Promise<ChatConversation[]> {
      // 1. Tenta RPC get_user_conversations
      try {
        type RpcCaller = (
          fn: string,
        ) => Promise<{ data: RpcConversationRow[] | null; error: unknown }>;

        const rpcCaller = supabase.rpc as unknown as RpcCaller;
        const { data: rpcData, error: rpcError } = await rpcCaller("get_user_conversations");

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

      // 2. Fallback de consulta manual da tabela messages
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
            ultimoConteudo: msg.conteudo,
            ultimoTimestamp: msg.timestamp,
          });
        }
      }

      return Array.from(map.values());
    },
  };
}

export type MessagesService = ReturnType<typeof createMessagesService>;

let browserMessagesService: MessagesService | null = null;

export function getBrowserMessagesService(): MessagesService {
  browserMessagesService ??= createMessagesService(createSupabaseBrowserClient());
  return browserMessagesService;
}
