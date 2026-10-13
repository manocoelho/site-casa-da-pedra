import type { Message, UserRole } from "./entities";

export type ChatMessage = Message;

export interface ChatConversation {
  interlocutorId: string;
  interlocutorNome: string;
  interlocutorEmail?: string;
  interlocutorRole?: UserRole;
  ultimoConteudo?: string;
  ultimoTimestamp?: string;
}

export interface SendMessageResult {
  ok: boolean;
  data?: ChatMessage;
  error?: string;
}
