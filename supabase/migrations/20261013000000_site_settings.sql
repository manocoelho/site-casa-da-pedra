-- =============================================================================
-- Migration: 20261013000000_site_settings.sql
-- Tabela para gerenciamento dos textos, imagem de capa e contatos da página inicial
-- =============================================================================

create table if not exists public.site_settings (
  id               text primary key default 'main',
  eyebrow          text not null default 'Bananeiras · Paraíba',
  title            text not null default 'Casa da Pedra',
  slogan           text not null default 'Seu refúgio de pedra e aconchego no friozinho da serra paraibana.',
  cover_image_url  text not null default '/images/hero-casa-da-pedra.jpg',
  cover_image_alt  text not null default 'Casa da Pedra em Bananeiras',
  cta_label        text not null default 'Ver Disponibilidade',
  cta_href         text not null default '#flats',
  highlights       text[] not null default array['Clima de serra', 'Vista para as montanhas', 'Perto do centro histórico'],
  whatsapp         text not null default '5583999262031',
  instagram        text not null default 'flatcasadapedra',
  email            text not null default 'contato@casadapedra.com.br',
  updated_at       timestamptz not null default now()
);

-- RLS
alter table public.site_settings enable row level security;

create policy "site_settings: leitura pública"
  on public.site_settings for select to anon, authenticated
  using (true);

create policy "site_settings: admin atualiza"
  on public.site_settings for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "site_settings: admin insere"
  on public.site_settings for insert to authenticated
  with check ((select public.is_admin()));

-- Inserir registro padrão se ainda não existir
insert into public.site_settings (id)
values ('main')
on conflict (id) do nothing;
