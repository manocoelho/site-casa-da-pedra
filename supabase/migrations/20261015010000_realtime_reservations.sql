-- Migration: 20261015010000_realtime_reservations.sql
-- Descrição: Habilita publicação em tempo real para a tabela de reservas (notificação sonora instantânea no painel administrativo)

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reservations'
  ) then
    alter publication supabase_realtime add table public.reservations;
  end if;
end $$;
