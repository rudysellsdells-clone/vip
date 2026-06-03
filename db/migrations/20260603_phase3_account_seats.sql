-- Phase 3 account seats foundation
-- Adds an account-level seat ledger for reviewers, editors, admins, and viewers.

create table if not exists public.account_seats (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid references auth.users(id) on delete set null,
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

alter table public.account_seats enable row level security;

drop policy if exists "Users can view their account seats" on public.account_seats;
create policy "Users can view their account seats"
  on public.account_seats
  for select
  using (auth.uid() = owner_user_id);

drop policy if exists "Users can manage their account seats" on public.account_seats;
create policy "Users can manage their account seats"
  on public.account_seats
  for all
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

create index if not exists account_seats_owner_user_id_idx
  on public.account_seats(owner_user_id);

create index if not exists account_seats_email_idx
  on public.account_seats(email);
