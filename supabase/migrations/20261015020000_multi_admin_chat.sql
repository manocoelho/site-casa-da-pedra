-- =============================================================================
-- Migration: 20261015020000_multi_admin_chat.sql
-- Descrição: Permite que todos os administradores vejam, recebam e respondam
-- mensagens de clientes no chat da Casa da Pedra.
-- =============================================================================

-- 1. Atualiza política RLS de SELECT na tabela messages:
-- Participantes diretos leem a conversa E qualquer administrador lê todas as mensagens.
drop policy if exists "messages: participantes leem a conversa" on public.messages;
drop policy if exists "messages: participantes leem a conversa ou admin le todas" on public.messages;
drop policy if exists "messages: participantes leem a conversa ou admin lê todas" on public.messages;

create policy "messages: participantes leem a conversa ou admin lê todas"
  on public.messages for select to authenticated
  using (
    (select auth.uid()) in (sender_id, receiver_id)
    or (select public.is_admin())
  );

-- 2. Atualiza a função get_user_conversations() para que:
-- - Para administradores: liste todos os clientes que enviaram ou receberam mensagens com a equipe.
-- - Para clientes: liste sua conversa com a administração da Casa da Pedra.
create or replace function public.get_user_conversations()
returns table (
  interlocutor_id    uuid,
  interlocutor_nome  text,
  interlocutor_email text,
  interlocutor_role  public.user_role,
  ultimo_conteudo    text,
  ultimo_timestamp   timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return;
  end if;

  select exists (
    select 1 from public.users where id = v_uid and role = 'admin'
  ) into v_is_admin;

  if v_is_admin then
    -- Administrador: visualiza conversas de todos os clientes com qualquer membro da administração
    return query
    with admin_users as (
      select id from public.users where role = 'admin'
    ),
    client_threads as (
      select
        case
          when m.sender_id in (select id from admin_users) then m.receiver_id
          else m.sender_id
        end as client_id,
        m.conteudo,
        m.timestamp as msg_time,
        row_number() over (
          partition by case
            when m.sender_id in (select id from admin_users) then m.receiver_id
            else m.sender_id
          end
          order by m.timestamp desc
        ) as rn
      from public.messages m
      where m.sender_id in (select id from admin_users)
         or m.receiver_id in (select id from admin_users)
    )
    select
      u.id as interlocutor_id,
      coalesce(nullif(trim(u.nome), ''), 'Hóspede') as interlocutor_nome,
      u.email as interlocutor_email,
      u.role as interlocutor_role,
      ct.conteudo as ultimo_conteudo,
      ct.msg_time as ultimo_timestamp
    from client_threads ct
    join public.users u on u.id = ct.client_id
    where ct.rn = 1
      and u.role <> 'admin'
    order by ct.msg_time desc;
  else
    -- Cliente (Hóspede): visualiza conversas dele com o anfitrião/administração
    return query
    with user_msgs as (
      select
        case
          when m.sender_id = v_uid then m.receiver_id
          else m.sender_id
        end as other_id,
        m.conteudo,
        m.timestamp as msg_time,
        row_number() over (
          partition by case when m.sender_id = v_uid then m.receiver_id else m.sender_id end
          order by m.timestamp desc
        ) as rn
      from public.messages m
      where m.sender_id = v_uid or m.receiver_id = v_uid
    )
    select
      u.id as interlocutor_id,
      coalesce(nullif(trim(u.nome), ''), 'Casa da Pedra') as interlocutor_nome,
      u.email as interlocutor_email,
      u.role as interlocutor_role,
      um.conteudo as ultimo_conteudo,
      um.msg_time as ultimo_timestamp
    from user_msgs um
    join public.users u on u.id = um.other_id
    where um.rn = 1
    order by um.msg_time desc;
  end if;
end;
$$;

grant execute on function public.get_user_conversations() to authenticated;

-- 3. Nova função RPC get_conversation_messages(p_interlocutor_id uuid)
-- Retorna todo o histórico de mensagens de uma conversa com segurança e unificação entre admins.
create or replace function public.get_conversation_messages(p_interlocutor_id uuid)
returns table (
  id          uuid,
  sender_id   uuid,
  receiver_id uuid,
  conteudo    text,
  timestamp   timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_is_admin boolean;
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null or p_interlocutor_id is null then
    return;
  end if;

  select exists (
    select 1 from public.users where id = v_uid and role = 'admin'
  ) into v_is_admin;

  if v_is_admin then
    -- Admin consultando mensagens de um cliente:
    -- Retorna todas as mensagens trocadas entre esse cliente e qualquer admin.
    return query
    select m.id, m.sender_id, m.receiver_id, m.conteudo, m.timestamp
    from public.messages m
    where (
      (m.sender_id = p_interlocutor_id and m.receiver_id in (select u.id from public.users u where u.role = 'admin'))
      or
      (m.receiver_id = p_interlocutor_id and m.sender_id in (select u.id from public.users u where u.role = 'admin'))
    )
    order by m.timestamp asc;
  else
    -- Cliente consultando mensagens com a administração:
    -- Retorna todas as mensagens enviadas por ele ou enviadas por qualquer admin para ele.
    return query
    select m.id, m.sender_id, m.receiver_id, m.conteudo, m.timestamp
    from public.messages m
    where (
      (m.sender_id = v_uid and m.receiver_id in (select u.id from public.users u where u.role = 'admin'))
      or
      (m.receiver_id = v_uid and m.sender_id in (select u.id from public.users u where u.role = 'admin'))
      or
      (m.sender_id = v_uid and m.receiver_id = p_interlocutor_id)
      or
      (m.receiver_id = v_uid and m.sender_id = p_interlocutor_id)
    )
    order by m.timestamp asc;
  end if;
end;
$$;

grant execute on function public.get_conversation_messages(uuid) to authenticated;
