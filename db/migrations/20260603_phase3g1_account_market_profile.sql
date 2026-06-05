-- Phase 3G.1 Account Market Profile
-- Adds/strengthens account-level service lines, audiences, and offers.
-- This reuses the existing service_lines, buyer_segments, and offers tables and scopes records by account_id.

alter table public.service_lines add column if not exists account_id uuid references public.accounts(id) on delete set null;
alter table public.buyer_segments add column if not exists account_id uuid references public.accounts(id) on delete set null;
alter table public.offers add column if not exists account_id uuid references public.accounts(id) on delete set null;

create index if not exists idx_service_lines_account_id on public.service_lines(account_id);
create index if not exists idx_buyer_segments_account_id on public.buyer_segments(account_id);
create index if not exists idx_offers_account_id on public.offers(account_id);

-- Let account members view account-scoped strategy records.
drop policy if exists "Account members can view account service lines" on public.service_lines;
create policy "Account members can view account service lines"
on public.service_lines
for select
to authenticated
using (
  account_id is not null
  and public.user_can_view_account(account_id)
);

drop policy if exists "Account members can view account audiences" on public.buyer_segments;
create policy "Account members can view account audiences"
on public.buyer_segments
for select
to authenticated
using (
  account_id is not null
  and public.user_can_view_account(account_id)
);

drop policy if exists "Account members can view account offers" on public.offers;
create policy "Account members can view account offers"
on public.offers
for select
to authenticated
using (
  account_id is not null
  and public.user_can_view_account(account_id)
);

-- Let account owners/admins manage account-scoped strategy records when the user client is used.
-- The API routes still prefer the service-role client for safer server-side writes.
drop policy if exists "Account managers can insert account service lines" on public.service_lines;
create policy "Account managers can insert account service lines"
on public.service_lines
for insert
to authenticated
with check (
  account_id is not null
  and user_id = auth.uid()
  and public.user_can_manage_account(account_id)
);

drop policy if exists "Account managers can update account service lines" on public.service_lines;
create policy "Account managers can update account service lines"
on public.service_lines
for update
to authenticated
using (
  account_id is not null
  and public.user_can_manage_account(account_id)
)
with check (
  account_id is not null
  and public.user_can_manage_account(account_id)
);

drop policy if exists "Account managers can insert account audiences" on public.buyer_segments;
create policy "Account managers can insert account audiences"
on public.buyer_segments
for insert
to authenticated
with check (
  account_id is not null
  and user_id = auth.uid()
  and public.user_can_manage_account(account_id)
);

drop policy if exists "Account managers can update account audiences" on public.buyer_segments;
create policy "Account managers can update account audiences"
on public.buyer_segments
for update
to authenticated
using (
  account_id is not null
  and public.user_can_manage_account(account_id)
)
with check (
  account_id is not null
  and public.user_can_manage_account(account_id)
);

drop policy if exists "Account managers can insert account offers" on public.offers;
create policy "Account managers can insert account offers"
on public.offers
for insert
to authenticated
with check (
  account_id is not null
  and user_id = auth.uid()
  and public.user_can_manage_account(account_id)
);

drop policy if exists "Account managers can update account offers" on public.offers;
create policy "Account managers can update account offers"
on public.offers
for update
to authenticated
using (
  account_id is not null
  and public.user_can_manage_account(account_id)
)
with check (
  account_id is not null
  and public.user_can_manage_account(account_id)
);
