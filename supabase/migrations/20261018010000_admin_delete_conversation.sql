-- =============================================================================
-- Migration: 20261018010000_admin_delete_conversation.sql
-- Descrição: Permite que administradores encerrem/excluam conversas de clientes
-- na tabela public.messages para evitar acúmulo de abas de atendimento.
-- =============================================================================

-- 1. Política RLS permitindo que administradores removam mensagens
drop policy if exists "messages: admin remove mensagens" on public.messages;
create policy "messages: admin remove mensagens"
  on public.messages
  for delete
  to authenticated
  using ((select public.is_admin()));

-- 2. Função RPC para excluir todas as mensagens de uma conversa com um hóspede
create or replace function public.delete_conversation_messages(p_interlocutor_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem encerrar ou excluir conversas.'
      using errcode = '42501';
  end if;

  delete from public.messages
  where sender_id = p_interlocutor_id
     or receiver_id = p_interlocutor_id;
end;
$$;

grant execute on function public.delete_conversation_messages(uuid) to authenticated;
