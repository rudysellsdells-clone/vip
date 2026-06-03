-- Phase 3 owner account + seats foundation
-- Makes the signed-in primary account the owner account and lets that owner create team seats.

alter table public.profiles
  add column if not exists account_owner_id uuid references public.profiles(id) on delete set null;

alter table public.profiles
  add column if not exists account_role text not null default 'owner'
  check (account_role in ('owner', 'admin', 'editor', 'reviewer', 'viewer'));

alter table public.profiles
  add column if not exists account_status text not null default 'active'
  check (account_status in ('active', 'pending', 'removed', 'disabled'));

update public.profiles
set account_owner_id = id,
    account_role = coalesce(account_role, 'owner'),
    account_status = coalesce(account_status, 'active'),
    updated_at = now()
where account_owner_id is null;

create table if not exists public.account_seats (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  invited_by uuid references public.profiles(id) on delete set null,
  auth_user_id uuid references public.profiles(id) on delete set null,
  email text not null,
  full_name text,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'reviewer', 'viewer')),
  status text not null default 'pending' check (status in ('pending', 'active', 'removed')),
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_user_id, email)
);

alter table public.account_seats
  add column if not exists auth_user_id uuid references public.profiles(id) on delete set null;

alter table public.account_seats enable row level security;

drop trigger if exists account_seats_set_updated_at on public.account_seats;
create trigger account_seats_set_updated_at
before update on public.account_seats
for each row execute function public.set_updated_at();

create index if not exists account_seats_owner_user_id_idx
  on public.account_seats(owner_user_id);

create index if not exists account_seats_email_idx
  on public.account_seats(email);

create index if not exists account_seats_auth_user_id_idx
  on public.account_seats(auth_user_id);

drop policy if exists "Owners can view their account seats" on public.account_seats;
create policy "Owners can view their account seats"
  on public.account_seats
  for select
  to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists "Owners can manage their account seats" on public.account_seats;
create policy "Owners can manage their account seats"
  on public.account_seats
  for all
  to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);
