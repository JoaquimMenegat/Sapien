-- ============================================================================
-- Sapien — Agenda de leitura (grade semanal recorrente)
-- Cole no SQL Editor do Supabase e execute. Pode rodar mais de uma vez.
-- ============================================================================
-- Cada linha é um compromisso de leitura que se repete toda semana:
--   weekday   0 = domingo … 6 = sábado
--   start_min minutos desde 00:00 (ex.: 1290 = 21:30)
-- O livro é opcional (leitura livre). RLS: cada usuário só vê e mexe no que é dele.
-- ============================================================================

create table if not exists public.schedule_slots (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references auth.users (id) on delete cascade,
  book_id      bigint references public.books (id) on delete set null,
  weekday      smallint not null check (weekday between 0 and 6),
  start_min    integer not null check (start_min between 0 and 1439),
  duration_min integer not null check (duration_min > 0),
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists schedule_slots_user_idx on public.schedule_slots (user_id);

alter table public.schedule_slots enable row level security;

drop policy if exists "schedule: dono le" on public.schedule_slots;
create policy "schedule: dono le" on public.schedule_slots
  for select using (auth.uid() = user_id);

drop policy if exists "schedule: dono cria" on public.schedule_slots;
create policy "schedule: dono cria" on public.schedule_slots
  for insert with check (auth.uid() = user_id);

drop policy if exists "schedule: dono edita" on public.schedule_slots;
create policy "schedule: dono edita" on public.schedule_slots
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "schedule: dono apaga" on public.schedule_slots;
create policy "schedule: dono apaga" on public.schedule_slots
  for delete using (auth.uid() = user_id);
