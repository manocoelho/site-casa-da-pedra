-- =============================================================================
-- Migration: 20261012020000_chat_conversations.sql
-- Adiciona função RPC para listar conversas ativas com resumo da última mensagem
-- =============================================================================

create or replace function public.get_user_conversations()
returns table (
  interlocutor_id    uuid,
  interlocutor_nome  text,
  interlocutor_email text,
  interlocutor_role  public.user_role,
  ultimo_conteudo    text,
  ultimo_timestamp   timestamptz
)
language sql
security definer
set search_path = ''
as $$
  with user_msgs as (
    select
      case
        when m.sender_id = (select auth.uid()) then m.receiver_id
        else m.sender_id
      end as other_id,
      m.conteudo,
      m.timestamp as msg_time,
      row_number() over (
        partition by case when m.sender_id = (select auth.uid()) then m.receiver_id else m.sender_id end
        order by m.timestamp desc
      ) as rn
    from public.messages m
    where m.sender_id = (select auth.uid()) or m.receiver_id = (select auth.uid())
  )
  select
    u.id as interlocutor_id,
    coalesce(u.nome, 'Usuário') as interlocutor_nome,
    u.email as interlocutor_email,
    u.role as interlocutor_role,
    um.conteudo as ultimo_conteudo,
    um.msg_time as ultimo_timestamp
  from user_msgs um
  join public.users u on u.id = um.other_id
  where um.rn = 1
  order by um.msg_time desc;
$$;

grant execute on function public.get_user_conversations() to authenticated;
