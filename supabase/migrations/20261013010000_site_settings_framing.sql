-- =============================================================================
-- Migration: 20261013010000_site_settings_framing.sql
-- Adiciona suporte para enquadramento e estilo da foto de capa (cover_position e cover_fit)
-- =============================================================================

alter table public.site_settings
  add column if not exists cover_position text not null default 'center 25%',
  add column if not exists cover_fit text not null default 'cover';
