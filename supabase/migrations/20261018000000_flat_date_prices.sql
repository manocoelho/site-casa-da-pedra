-- =============================================================================
-- Migration: 20261018000000_flat_date_prices.sql
-- Descrição: Permite definir preços personalizados para cada data individual
-- de cada Flat (tarifário dinâmico por dia) e salva o valor_total na reserva.
-- =============================================================================

-- 1. Tabela de preços personalizados por data unitária
create table if not exists public.flat_date_prices (
  id         uuid primary key default gen_random_uuid(),
  flat_id    uuid not null references public.flats (id) on delete cascade,
  data       date not null,
  preco      numeric(10, 2) not null check (preco >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint flat_date_prices_unique unique (flat_id, data)
);

create index if not exists flat_date_prices_flat_data_idx
  on public.flat_date_prices (flat_id, data);

-- 2. Coluna valor_total na tabela reservations para registrar o valor acordado no ato da reserva
alter table public.reservations
  add column if not exists valor_total numeric(10, 2);

-- 3. Permissões e RLS para flat_date_prices
grant select on public.flat_date_prices to anon, authenticated;
grant insert, update, delete on public.flat_date_prices to authenticated;

alter table public.flat_date_prices enable row level security;

drop policy if exists "flat_date_prices: leitura publica" on public.flat_date_prices;
create policy "flat_date_prices: leitura publica"
  on public.flat_date_prices for select to anon, authenticated
  using (true);

drop policy if exists "flat_date_prices: admin gerencia" on public.flat_date_prices;
create policy "flat_date_prices: admin gerencia"
  on public.flat_date_prices for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));
