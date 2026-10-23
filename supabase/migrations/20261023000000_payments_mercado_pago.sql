-- =============================================================================
-- Migration: 20261023000000_payments_mercado_pago.sql
-- Descrição: Adiciona suporte completo a pagamentos via Pix (com desconto e
-- expiração automática em 30 minutos) e Cartão de Crédito via Mercado Pago.
-- =============================================================================

-- 1. Novas colunas de pagamento na tabela public.reservations
alter table public.reservations
  add column if not exists valor_total         numeric(10, 2),
  add column if not exists valor_desconto      numeric(10, 2) default 0,
  add column if not exists metodo_pagamento    text check (metodo_pagamento in ('pix', 'cartao')),
  add column if not exists status_pagamento    text default 'pendente' check (status_pagamento in ('pendente', 'aprovado', 'recusado', 'expirado', 'reembolsado')),
  add column if not exists mp_payment_id       text,
  add column if not exists mp_preference_id    text,
  add column if not exists pix_qr_code         text,
  add column if not exists pix_qr_code_base64  text,
  add column if not exists pix_expira_em       timestamptz;

create index if not exists idx_reservations_mp_payment_id
  on public.reservations (mp_payment_id)
  where mp_payment_id is not null;

-- 2. Configurações de pagamento editáveis no Painel Admin (public.site_settings)
alter table public.site_settings
  add column if not exists pix_discount_percent numeric(5, 2) not null default 10,
  add column if not exists max_installments     integer not null default 6;

-- 3. Função utilitária que expira reservas pendentes cujo prazo de 30 min venceu
create or replace function public.expire_unpaid_reservations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  update public.reservations
  set
    status = 'cancelada',
    status_pagamento = 'expirado',
    updated_at = now()
  where status = 'pendente'
    and coalesce(status_pagamento, 'pendente') <> 'aprovado'
    and pix_expira_em is not null
    and pix_expira_em < now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.expire_unpaid_reservations() to anon, authenticated;

-- 4. Atualiza get_flat_occupied_ranges para liberar automaticamente reservas Pix expiradas
create or replace function public.get_flat_occupied_ranges(p_flat_id uuid)
returns table (
  data_inicio date,
  data_fim    date
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.expire_unpaid_reservations();

  return query
  select
    r.data_inicio,
    r.data_fim
  from public.reservations r
  where r.flat_id = p_flat_id
    and r.status in ('pendente', 'confirmada')
    and (r.pix_expira_em is null or r.pix_expira_em > now() or r.status = 'confirmada')
    and r.data_fim >= current_date
  order by r.data_inicio asc;
end;
$$;

grant execute on function public.get_flat_occupied_ranges(uuid) to anon, authenticated;
