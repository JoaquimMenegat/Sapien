-- ============================================================================
-- Sapien — assinaturas (quem é Premium). Gateway: Asaas.
-- Cole no SQL Editor do Supabase e execute. Pode rodar mais de uma vez.
-- ============================================================================
-- Regra de ouro: esta tabela é a "fonte da verdade" de quem é Premium, e é
-- escrita SÓ pelo backend (webhook do Asaas, via service_role). O usuário
-- apenas LÊ o próprio status — ninguém consegue se tornar Premium por conta.
--
-- status: none | trialing | active | past_due | canceled
-- plan:   monthly | yearly
-- ============================================================================

create table if not exists public.subscriptions (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  status                text not null default 'none',
  plan                  text,
  asaas_customer_id     text,
  asaas_subscription_id text,
  trial_ends_at         timestamptz,
  current_period_end    timestamptz,
  updated_at            timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

-- Só o dono LÊ. (Não há policy de insert/update/delete p/ authenticated:
-- escrita fica exclusiva do service_role, usado pelo webhook do Asaas.)
drop policy if exists "subs: dono le" on public.subscriptions;
create policy "subs: dono le" on public.subscriptions
  for select using (auth.uid() = user_id);

-- Ao criar a conta, já concede 7 dias de Premium em trial (sem cartão).
create or replace function public.handle_new_user_subscription()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.subscriptions (user_id, status, trial_ends_at)
  values (new.id, 'trialing', now() + interval '7 days')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_subscription on auth.users;
create trigger on_auth_user_created_subscription
  after insert on auth.users
  for each row execute function public.handle_new_user_subscription();

-- Backfill: usuários que já existiam ganham a linha de trial também (não sobrescreve).
insert into public.subscriptions (user_id, status, trial_ends_at)
select id, 'trialing', now() + interval '7 days' from auth.users
on conflict (user_id) do nothing;
