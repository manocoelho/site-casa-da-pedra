-- =============================================================================
-- Migration: 20261016000000_ical_sync.sql
-- Descrição: Sincronização bidirecional de calendários iCal (.ics) com
-- Airbnb, Booking.com e outras plataformas para prevenção de overbooking.
-- =============================================================================

-- 1. Tabela de links de calendários externos (Airbnb, Booking.com, etc.) por Flat
create table if not exists public.flat_ical_feeds (
  id               uuid primary key default gen_random_uuid(),
  flat_id          uuid not null references public.flats (id) on delete cascade,
  plataforma       text not null check (plataforma in ('airbnb', 'booking', 'outro')),
  nome             text not null default 'Calendário Externo',
  ical_url         text not null check (char_length(trim(ical_url)) > 0),
  last_synced_at   timestamptz,
  last_sync_status text check (last_sync_status in ('ok', 'error')),
  last_sync_error  text,
  events_count     integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists flat_ical_feeds_flat_id_idx on public.flat_ical_feeds (flat_id);

-- 2. Tabela de bloqueios de datas importados de calendários externos (.ics)
create table if not exists public.external_calendar_blocks (
  id           uuid primary key default gen_random_uuid(),
  feed_id      uuid not null references public.flat_ical_feeds (id) on delete cascade,
  flat_id      uuid not null references public.flats (id) on delete cascade,
  plataforma   text not null default 'outro',
  external_uid text not null,
  summary      text not null default 'Reservado (Externo)',
  data_inicio  date not null,
  data_fim     date not null,
  updated_at   timestamptz not null default now(),

  constraint external_blocks_periodo_valido check (data_fim > data_inicio),
  constraint external_blocks_feed_uid_unique unique (feed_id, external_uid)
);

create index if not exists external_calendar_blocks_flat_id_idx
  on public.external_calendar_blocks (flat_id, data_inicio, data_fim);

-- 3. Grants e Políticas RLS
grant select on public.flat_ical_feeds, public.external_calendar_blocks to anon, authenticated;
grant insert, update, delete on public.flat_ical_feeds, public.external_calendar_blocks to authenticated;

alter table public.flat_ical_feeds enable row level security;
alter table public.external_calendar_blocks enable row level security;

-- Políticas para flat_ical_feeds
drop policy if exists "flat_ical_feeds: leitura publica" on public.flat_ical_feeds;
create policy "flat_ical_feeds: leitura publica"
  on public.flat_ical_feeds for select to anon, authenticated
  using (true);

drop policy if exists "flat_ical_feeds: admin gerencia" on public.flat_ical_feeds;
create policy "flat_ical_feeds: admin gerencia"
  on public.flat_ical_feeds for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- Políticas para external_calendar_blocks
drop policy if exists "external_calendar_blocks: leitura publica" on public.external_calendar_blocks;
create policy "external_calendar_blocks: leitura publica"
  on public.external_calendar_blocks for select to anon, authenticated
  using (true);

drop policy if exists "external_calendar_blocks: admin gerencia" on public.external_calendar_blocks;
create policy "external_calendar_blocks: admin gerencia"
  on public.external_calendar_blocks for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- 4. Função RPC segura para atualizar os bloqueios de um feed durante a sincronização
create or replace function public.sync_ical_feed_blocks(
  p_feed_id uuid,
  p_status  text,
  p_error   text default null,
  p_blocks  jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_flat_id    uuid;
  v_plataforma text;
begin
  select f.flat_id, f.plataforma
    into v_flat_id, v_plataforma
    from public.flat_ical_feeds f
   where f.id = p_feed_id;

  if v_flat_id is null then
    return;
  end if;

  if p_status = 'ok' then
    -- Remove bloqueios anteriores deste feed e insere os novos atualizados
    delete from public.external_calendar_blocks
     where feed_id = p_feed_id;

    insert into public.external_calendar_blocks (
      feed_id,
      flat_id,
      plataforma,
      external_uid,
      summary,
      data_inicio,
      data_fim,
      updated_at
    )
    select
      p_feed_id,
      v_flat_id,
      v_plataforma,
      coalesce(nullif(trim(item.external_uid), ''), gen_random_uuid()::text),
      coalesce(nullif(trim(item.summary), ''), 'Reservado (' || upper(v_plataforma) || ')'),
      item.data_inicio,
      item.data_fim,
      now()
    from jsonb_to_recordset(coalesce(p_blocks, '[]'::jsonb)) as item(
      external_uid text,
      summary      text,
      data_inicio  date,
      data_fim     date
    )
    where item.data_inicio is not null
      and item.data_fim is not null
      and item.data_fim > item.data_inicio
    on conflict (feed_id, external_uid) do update set
      summary     = excluded.summary,
      data_inicio = excluded.data_inicio,
      data_fim    = excluded.data_fim,
      updated_at  = now();

    update public.flat_ical_feeds
       set last_synced_at   = now(),
           last_sync_status = 'ok',
           last_sync_error  = null,
           events_count     = jsonb_array_length(coalesce(p_blocks, '[]'::jsonb)),
           updated_at       = now()
     where id = p_feed_id;
  else
    update public.flat_ical_feeds
       set last_synced_at   = now(),
           last_sync_status = 'error',
           last_sync_error  = p_error,
           updated_at       = now()
     where id = p_feed_id;
  end if;
end;
$$;

grant execute on function public.sync_ical_feed_blocks(uuid, text, text, jsonb) to anon, authenticated;

-- 5. Atualiza get_flat_occupied_ranges para unir reservas do site + bloqueios externos (Airbnb/Booking)
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
  select r.data_inicio, r.data_fim
  from public.reservations r
  where r.flat_id = p_flat_id
    and r.status in ('pendente', 'confirmada')
    and r.data_fim >= current_date
  union all
  select b.data_inicio, b.data_fim
  from public.external_calendar_blocks b
  where b.flat_id = p_flat_id
    and b.data_fim >= current_date
  order by data_inicio asc;
$$;

grant execute on function public.get_flat_occupied_ranges(uuid) to anon, authenticated;

-- 6. Função para exportação iCal (.ics): retorna apenas as reservas nativas do site
-- (Evita loop circular de re-exportar bloqueios do Airbnb/Booking de volta para eles)
create or replace function public.get_flat_native_reservations_ical(p_flat_id uuid)
returns table (
  id          uuid,
  data_inicio date,
  data_fim    date,
  status      public.reservation_status,
  created_at  timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.id,
    r.data_inicio,
    r.data_fim,
    r.status,
    r.created_at
  from public.reservations r
  where r.flat_id = p_flat_id
    and r.status in ('pendente', 'confirmada')
    and r.data_fim >= (current_date - interval '30 days')
  order by r.data_inicio asc;
$$;

grant execute on function public.get_flat_native_reservations_ical(uuid) to anon, authenticated;

-- 7. Trigger no banco para impedir novas reservas que conflitem com bloqueios do Airbnb/Booking
create or replace function public.check_external_calendar_conflict()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('pendente', 'confirmada') then
    if exists (
      select 1
      from public.external_calendar_blocks b
      where b.flat_id = new.flat_id
        and daterange(b.data_inicio, b.data_fim, '[)') && daterange(new.data_inicio, new.data_fim, '[)')
    ) then
      raise exception 'reservations_sem_sobreposicao: Período indisponível devido a reserva externa sincronizada (Airbnb/Booking).'
        using errcode = '23P01';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_check_external_blocks on public.reservations;
create trigger reservations_check_external_blocks
  before insert or update on public.reservations
  for each row execute function public.check_external_calendar_conflict();
