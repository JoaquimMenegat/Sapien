-- ============================================================================
-- Sapien — schema do SaaS (Supabase / Postgres)
-- Cole isto no SQL Editor do seu projeto Supabase e execute (uma vez).
-- Cada usuário só enxerga os próprios dados (Row Level Security = RLS).
-- ============================================================================

-- ---------- Perfil (1:1 com auth.users) ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text,
  picture    text,
  created_at timestamptz not null default now()
);

-- Cria um perfil automaticamente quando um usuário se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantém updated_at atualizado.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- ---------- Livros ----------
create table if not exists public.books (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references auth.users (id) on delete cascade,
  title          text not null,
  subtitle       text,
  authors        text,
  cover_url      text,
  isbn           text,
  total_pages    integer,
  current_page   integer not null default 0,
  synopsis       text,
  publisher      text,
  language       text,
  format         text,
  genres         text,
  status         text not null default 'wishlist',
  rating         integer,
  public_rating  real,
  ratings_count  integer,
  started_at     date,
  finished_at    date,
  verdict        text,
  google_books_id text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists books_user_idx on public.books (user_id);

drop trigger if exists books_touch on public.books;
create trigger books_touch before update on public.books
  for each row execute function public.touch_updated_at();

-- ---------- Sessões de leitura ----------
create table if not exists public.reading_sessions (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  book_id      bigint not null references public.books (id) on delete cascade,
  started_at   timestamptz not null default now(),
  ended_at     timestamptz,
  duration_min integer not null default 0,
  pages_read   integer not null default 0
);
create index if not exists sessions_user_idx on public.reading_sessions (user_id);
create index if not exists sessions_book_idx on public.reading_sessions (book_id);

-- ---------- Metas ----------
create table if not exists public.goals (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       text not null,
  target     integer not null,
  period     text,
  created_at timestamptz not null default now()
);
create index if not exists goals_user_idx on public.goals (user_id);

-- ---------- Notas / trechos ----------
create table if not exists public.notes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  book_id    bigint not null references public.books (id) on delete cascade,
  type       text not null default 'nota',
  content    text not null default '',
  page_ref   integer,
  created_at timestamptz not null default now()
);
create index if not exists notes_user_idx on public.notes (user_id);
create index if not exists notes_book_idx on public.notes (book_id);

-- ---------- Preferências por usuário (chave/valor) ----------
-- pomodoro.focus/break, reading.minSessionMin, ui.accent/animation, appearance, ai.model…
create table if not exists public.user_settings (
  user_id uuid not null references auth.users (id) on delete cascade,
  key     text not null,
  value   text,
  primary key (user_id, key)
);

-- ============================================================================
-- Row Level Security: cada usuário só acessa as próprias linhas.
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.books          enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.goals          enable row level security;
alter table public.notes          enable row level security;
alter table public.user_settings  enable row level security;

-- Dropa antes de criar (CREATE POLICY não aceita IF NOT EXISTS) — script re-executável.
drop policy if exists "profiles: dono" on public.profiles;
create policy "profiles: dono" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "books: dono" on public.books;
create policy "books: dono" on public.books
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "sessions: dono" on public.reading_sessions;
create policy "sessions: dono" on public.reading_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "goals: dono" on public.goals;
create policy "goals: dono" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "notes: dono" on public.notes;
create policy "notes: dono" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "settings: dono" on public.user_settings;
create policy "settings: dono" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- Auto-exclusão de conta: o usuário apaga a PRÓPRIA conta (linha em auth.users).
-- O ON DELETE CASCADE de todas as tabelas remove junto perfil, livros, sessões,
-- metas, notas e preferências. Roda como SECURITY DEFINER (dono = postgres) para
-- ter permissão de deletar em auth.users; só o próprio dono (auth.uid()) é afetado.
-- ============================================================================
create or replace function public.delete_own_user()
returns void
language plpgsql
security definer set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado.';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_user() from anon, public;
grant execute on function public.delete_own_user() to authenticated;
