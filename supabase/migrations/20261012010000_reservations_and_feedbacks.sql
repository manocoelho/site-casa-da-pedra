-- =============================================================================
-- Migration: 20261012010000_reservations_and_feedbacks.sql
-- Adiciona funções seguras para consulta de disponibilidade e feedbacks,
-- e flexibiliza inserção de avaliações por usuários autenticados.
-- =============================================================================

-- 1. Função RPC para consultar intervalos ocupados de um flat sem expor dados pessoais
create or replace function public.get_flat_occupied_ranges(p_flat_id uuid)
returns table (
  data_inicio date,
  data_fim    date
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.data_inicio,
    r.data_fim
  from public.reservations r
  where r.flat_id = p_flat_id
    and r.status in ('pendente', 'confirmada')
    and r.data_fim >= current_date
  order by r.data_inicio asc;
$$;

grant execute on function public.get_flat_occupied_ranges(uuid) to anon, authenticated;

-- 2. Função RPC para consultar feedbacks de um flat trazendo o nome público do autor
create or replace function public.get_flat_feedbacks(p_flat_id uuid)
returns table (
  id          uuid,
  flat_id     uuid,
  user_id     uuid,
  nota        smallint,
  comentario  text,
  created_at  timestamptz,
  autor_nome  text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    f.id,
    f.flat_id,
    f.user_id,
    f.nota,
    f.comentario,
    f.created_at,
    coalesce(u.nome, 'Hóspede') as autor_nome
  from public.feedbacks f
  left join public.users u on u.id = f.user_id
  where f.flat_id = p_flat_id
  order by f.created_at desc;
$$;

grant execute on function public.get_flat_feedbacks(uuid) to anon, authenticated;

-- 3. Atualiza política de inserção de feedbacks para permitir avaliação por clientes autenticados
drop policy if exists "feedbacks: cliente avalia flat em que concluiu estadia" on public.feedbacks;
drop policy if exists "feedbacks: cliente autenticado avalia flat" on public.feedbacks;

create policy "feedbacks: cliente autenticado avalia flat"
  on public.feedbacks for insert to authenticated
  with check (
    user_id = (select auth.uid())
  );
