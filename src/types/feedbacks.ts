import type { Feedback } from "./entities";

export interface FeedbackWithAuthor extends Feedback {
  autor_nome?: string;
}

export interface CreateFeedbackInput {
  flatId: string;
  nota: number;
  comentario?: string;
}

export interface FeedbackOperationResult<T = FeedbackWithAuthor> {
  ok: boolean;
  data?: T;
  error?: string;
}
