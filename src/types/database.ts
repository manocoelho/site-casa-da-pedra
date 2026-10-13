/**
 * Tipos do banco de dados Supabase.
 *
 * Espelha o schema definido em `supabase/migrations`. Pode ser regenerado
 * automaticamente com: `npm run db:types` (requer Supabase CLI + projeto linkado).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          nome: string;
          email: string | null;
          role: Database["public"]["Enums"]["user_role"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nome: string;
          email?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          email?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      flats: {
        Row: {
          id: string;
          titulo: string;
          descricao: string;
          preco_diaria: number;
          max_hospedes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          titulo: string;
          descricao?: string;
          preco_diaria: number;
          max_hospedes: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          descricao?: string;
          preco_diaria?: number;
          max_hospedes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      flat_photos: {
        Row: {
          id: string;
          flat_id: string;
          url_imagem: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          flat_id: string;
          url_imagem: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          flat_id?: string;
          url_imagem?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "flat_photos_flat_id_fkey";
            columns: ["flat_id"];
            isOneToOne: false;
            referencedRelation: "flats";
            referencedColumns: ["id"];
          },
        ];
      };
      reservations: {
        Row: {
          id: string;
          user_id: string;
          flat_id: string;
          data_inicio: string;
          data_fim: string;
          status: Database["public"]["Enums"]["reservation_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          flat_id: string;
          data_inicio: string;
          data_fim: string;
          status?: Database["public"]["Enums"]["reservation_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          flat_id?: string;
          data_inicio?: string;
          data_fim?: string;
          status?: Database["public"]["Enums"]["reservation_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reservations_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reservations_flat_id_fkey";
            columns: ["flat_id"];
            isOneToOne: false;
            referencedRelation: "flats";
            referencedColumns: ["id"];
          },
        ];
      };
      feedbacks: {
        Row: {
          id: string;
          user_id: string;
          flat_id: string;
          nota: number;
          comentario: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          flat_id: string;
          nota: number;
          comentario?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          flat_id?: string;
          nota?: number;
          comentario?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "feedbacks_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "feedbacks_flat_id_fkey";
            columns: ["flat_id"];
            isOneToOne: false;
            referencedRelation: "flats";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          receiver_id: string;
          conteudo: string;
          timestamp: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          receiver_id: string;
          conteudo: string;
          timestamp?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          receiver_id?: string;
          conteudo?: string;
          timestamp?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_sender_id_fkey";
            columns: ["sender_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "messages_receiver_id_fkey";
            columns: ["receiver_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_admin: {
        Args: never;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: "admin" | "client";
      reservation_status: "pendente" | "confirmada" | "cancelada" | "concluida";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database["public"];

/** Linha de uma tabela (SELECT). Ex.: `Tables<"flats">` */
export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];

/** Payload de INSERT de uma tabela. */
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];

/** Payload de UPDATE de uma tabela. */
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

/** Valores de um enum do banco. */
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T];
