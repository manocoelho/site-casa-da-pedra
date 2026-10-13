-- =============================================================================
-- Casa da Pedra — Schema inicial
-- -----------------------------------------------------------------------------
-- Tabelas: users, flats, flat_photos, reservations, feedbacks, messages
-- Inclui: enums, constraints, índices, triggers, RLS, bucket de Storage e Realtime.
--
-- Como aplicar:
--   • Supabase CLI:  npx supabase link --project-ref <ref> && npx supabase db push
--   • Ou cole este arquivo no SQL Editor do painel do Supabase e execute.
-- =============================================================================

-- Necessária para a exclusion constraint que impede reservas sobrepostas.
create extension if not exists btree_gist with schema extensions;

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('admin', 'client');

create type public.reservation_status as enum (
  'pendente',
  'confirmada',
  'cancelada',
  'concluida'
);

-- -----------------------------------------------------------------------------
-- Função utilitária: mantém updated_at atualizado
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- users  (perfil público, 1:1 com auth.users)
-- =============================================================================
create table public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  nome        text not null check (char_length(trim(nome)) between 1 and 120),
  -- Nulo apenas para provedores OAuth que não retornam e-mail (ex.: Facebook sem e-mail verificado).
  email       text unique,
  role        public.user_role not null default 'client',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.users is 'Perfil dos usuários. Criado automaticamente via trigger ao cadastrar em auth.users.';

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Verifica se o usuário autenticado é admin.
-- SECURITY DEFINER evita recursão de RLS ao ser usada dentro das policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

-- Cria o perfil em public.users sempre que um usuário é criado em auth.users
-- (e-mail/senha ou OAuth). O role é SEMPRE 'client': nunca confiar em metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, nome, email)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'nome'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Hóspede'
    ),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém o e-mail sincronizado quando alterado no Auth.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- Impede que clientes alterem campos privilegiados (role/email) do próprio perfil.
create or replace function public.protect_user_privileged_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.role is distinct from old.role or new.email is distinct from old.email)
     and current_user not in ('postgres', 'supabase_admin', 'service_role')
     and not public.is_admin()
  then
    raise exception 'Sem permissão para alterar role ou e-mail do usuário.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger users_protect_privileged_columns
  before update on public.users
  for each row execute function public.protect_user_privileged_columns();

-- =============================================================================
-- flats
-- =============================================================================
create table public.flats (
  id            uuid primary key default gen_random_uuid(),
  titulo        text not null check (char_length(trim(titulo)) between 3 and 150),
  descricao     text not null default '',
  preco_diaria  numeric(10, 2) not null check (preco_diaria >= 0),
  max_hospedes  integer not null check (max_hospedes > 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger flats_set_updated_at
  before update on public.flats
  for each row execute function public.set_updated_at();

-- =============================================================================
-- flat_photos
-- =============================================================================
create table public.flat_photos (
  id          uuid primary key default gen_random_uuid(),
  flat_id     uuid not null references public.flats (id) on delete cascade,
  url_imagem  text not null check (char_length(url_imagem) > 0),
  created_at  timestamptz not null default now()
);

create index flat_photos_flat_id_idx on public.flat_photos (flat_id);

-- =============================================================================
-- reservations
-- =============================================================================
create table public.reservations (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.users (id) on delete cascade,
  flat_id      uuid not null references public.flats (id) on delete restrict,
  data_inicio  date not null,
  data_fim     date not null,
  status       public.reservation_status not null default 'pendente',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint reservations_periodo_valido check (data_fim > data_inicio),

  -- Regra de negócio garantida no banco: um flat não pode ter duas reservas
  -- ativas (pendente/confirmada) com períodos sobrepostos. Intervalo [inicio, fim)
  -- permite check-out e check-in no mesmo dia.
  constraint reservations_sem_sobreposicao exclude using gist (
    flat_id with =,
    daterange(data_inicio, data_fim, '[)') with &&
  ) where (status in ('pendente', 'confirmada'))
);

create index reservations_user_id_idx on public.reservations (user_id);
create index reservations_flat_id_idx on public.reservations (flat_id);

create trigger reservations_set_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

-- Clientes só podem alterar o status (ex.: cancelar); datas/flat/usuário são imutáveis para eles.
create or replace function public.protect_reservation_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (new.user_id, new.flat_id, new.data_inicio, new.data_fim)
       is distinct from (old.user_id, old.flat_id, old.data_inicio, old.data_fim)
     and current_user not in ('postgres', 'supabase_admin', 'service_role')
     and not public.is_admin()
  then
    raise exception 'Apenas administradores podem alterar dados da reserva.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger reservations_protect_columns
  before update on public.reservations
  for each row execute function public.protect_reservation_columns();

-- =============================================================================
-- feedbacks
-- =============================================================================
create table public.feedbacks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  flat_id     uuid not null references public.flats (id) on delete cascade,
  nota        smallint not null check (nota between 1 and 5),
  comentario  text check (comentario is null or char_length(comentario) <= 2000),
  created_at  timestamptz not null default now(),

  -- Um feedback por usuário por flat.
  constraint feedbacks_unico_por_usuario_flat unique (user_id, flat_id)
);

create index feedbacks_flat_id_idx on public.feedbacks (flat_id);

-- =============================================================================
-- messages
-- =============================================================================
create table public.messages (
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.users (id) on delete cascade,
  receiver_id  uuid not null references public.users (id) on delete cascade,
  conteudo     text not null check (char_length(trim(conteudo)) between 1 and 5000),
  "timestamp"  timestamptz not null default now(),

  constraint messages_sem_auto_envio check (sender_id <> receiver_id)
);

create index messages_sender_idx   on public.messages (sender_id, "timestamp" desc);
create index messages_receiver_idx on public.messages (receiver_id, "timestamp" desc);

-- =============================================================================
-- Grants explícitos (o acesso real é controlado pelas policies de RLS abaixo)
-- =============================================================================
grant usage on schema public to anon, authenticated;
grant select on public.flats, public.flat_photos, public.feedbacks to anon;
grant select, insert, update, delete on
  public.users, public.flats, public.flat_photos,
  public.reservations, public.feedbacks, public.messages
  to authenticated;

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.users        enable row level security;
alter table public.flats        enable row level security;
alter table public.flat_photos  enable row level security;
alter table public.reservations enable row level security;
alter table public.feedbacks    enable row level security;
alter table public.messages     enable row level security;

-- ---------- users ----------
create policy "users: ler o próprio perfil ou admin lê todos"
  on public.users for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

create policy "users: qualquer autenticado vê perfis de admin (contato)"
  on public.users for select to authenticated
  using (role = 'admin');

create policy "users: atualizar o próprio perfil"
  on public.users for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "users: admin atualiza qualquer perfil"
  on public.users for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------- flats ----------
create policy "flats: leitura pública"
  on public.flats for select to anon, authenticated
  using (true);

create policy "flats: admin insere"
  on public.flats for insert to authenticated
  with check ((select public.is_admin()));

create policy "flats: admin atualiza"
  on public.flats for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "flats: admin remove"
  on public.flats for delete to authenticated
  using ((select public.is_admin()));

-- ---------- flat_photos ----------
create policy "flat_photos: leitura pública"
  on public.flat_photos for select to anon, authenticated
  using (true);

create policy "flat_photos: admin insere"
  on public.flat_photos for insert to authenticated
  with check ((select public.is_admin()));

create policy "flat_photos: admin atualiza"
  on public.flat_photos for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "flat_photos: admin remove"
  on public.flat_photos for delete to authenticated
  using ((select public.is_admin()));

-- ---------- reservations ----------
create policy "reservations: cliente vê as próprias, admin vê todas"
  on public.reservations for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "reservations: cliente cria reserva pendente futura"
  on public.reservations for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pendente'
    and data_inicio >= current_date
  );

create policy "reservations: cliente cancela a própria reserva ativa"
  on public.reservations for update to authenticated
  using (user_id = (select auth.uid()) and status in ('pendente', 'confirmada'))
  with check (user_id = (select auth.uid()) and status = 'cancelada');

create policy "reservations: admin gerencia todas"
  on public.reservations for all to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ---------- feedbacks ----------
create policy "feedbacks: leitura pública"
  on public.feedbacks for select to anon, authenticated
  using (true);

create policy "feedbacks: cliente avalia flat em que concluiu estadia"
  on public.feedbacks for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.reservations r
      where r.user_id = (select auth.uid())
        and r.flat_id = feedbacks.flat_id
        and r.status = 'concluida'
    )
  );

create policy "feedbacks: autor edita o próprio"
  on public.feedbacks for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "feedbacks: autor ou admin remove"
  on public.feedbacks for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------- messages ----------
create policy "messages: participantes leem a conversa"
  on public.messages for select to authenticated
  using ((select auth.uid()) in (sender_id, receiver_id));

create policy "messages: usuário envia como ele mesmo"
  on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()));

-- =============================================================================
-- Storage: bucket público para as fotos dos flats (upload restrito a admins)
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'flat-photos',
  'flat-photos',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

create policy "flat-photos: leitura pública"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'flat-photos');

create policy "flat-photos: admin faz upload"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'flat-photos' and (select public.is_admin()));

create policy "flat-photos: admin atualiza"
  on storage.objects for update to authenticated
  using (bucket_id = 'flat-photos' and (select public.is_admin()))
  with check (bucket_id = 'flat-photos' and (select public.is_admin()));

create policy "flat-photos: admin remove"
  on storage.objects for delete to authenticated
  using (bucket_id = 'flat-photos' and (select public.is_admin()));

-- =============================================================================
-- Realtime: habilita streaming de novas mensagens (chat)
-- =============================================================================
alter publication supabase_realtime add table public.messages;
