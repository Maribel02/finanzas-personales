-- Mi Balance: esquema inicial para autenticación, perfil y sincronización.
-- Ejecuta todo este archivo en Supabase > SQL Editor > New query.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Usuario' check (char_length(trim(display_name)) between 1 and 60),
  updated_at timestamptz not null default now()
);

create table if not exists public.finance_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{"transactions":[],"budgets":[]}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint finance_data_payload_is_object check (jsonb_typeof(payload) = 'object')
);

alter table public.profiles enable row level security;
alter table public.finance_data enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Users can read own finance data" on public.finance_data;
create policy "Users can read own finance data" on public.finance_data
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users can insert own finance data" on public.finance_data;
create policy "Users can insert own finance data" on public.finance_data
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "Users can update own finance data" on public.finance_data;
create policy "Users can update own finance data" on public.finance_data
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.finance_data to authenticated;

-- No agregues la clave service_role a .env del frontend. Usa solo la clave publishable/anon.
