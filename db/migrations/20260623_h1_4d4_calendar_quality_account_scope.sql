-- H1.4D4: Calendar + Quality Review Account Scope
-- Adds workspace scoping for legacy content calendar plan/item rows and
-- account-aware RLS access for quality reviews/quality gate decisions through their assets.

create extension if not exists "pgcrypto";

alter table public.content_calendar_plans
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

alter table public.content_calendar_items
  add column if not exists account_id uuid references public.accounts(id) on delete set null;

create index if not exists idx_content_calendar_plans_account_id
  on public.content_calendar_plans(account_id);

create index if not exists idx_content_calendar_items_account_id
  on public.content_calendar_items(account_id);

-- Backfill item account IDs from linked campaigns when possible.
update public.content_calendar_items cci
set account_id = c.account_id
from public.campaigns c
where cci.account_id is null
  and cci.campaign_id = c.id
  and c.account_id is not null;

-- Backfill plans from the first scoped item in each plan when possible.
with plan_accounts as (
  select distinct on (plan_id)
    plan_id,
    account_id
  from public.content_calendar_items
  where account_id is not null
  order by plan_id, updated_at desc nulls last, created_at desc nulls last
)
update public.content_calendar_plans p
set account_id = pa.account_id
from plan_accounts pa
where p.account_id is null
  and p.id = pa.plan_id;

-- Backfill items from their now-scoped plans when possible.
update public.content_calendar_items cci
set account_id = p.account_id
from public.content_calendar_plans p
where cci.account_id is null
  and cci.plan_id = p.id
  and p.account_id is not null;

-- Add account-aware policies without deleting the older user-owned policies.
-- The legacy user-owned policies remain as a fallback for old unassigned rows.

drop policy if exists "Account members can view content calendar plans" on public.content_calendar_plans;
create policy "Account members can view content calendar plans"
on public.content_calendar_plans for select
to authenticated
using (
  account_id is not null
  and public.user_can_view_account(account_id)
);

drop policy if exists "Account managers can insert content calendar plans" on public.content_calendar_plans;
create policy "Account managers can insert content calendar plans"
on public.content_calendar_plans for insert
to authenticated
with check (
  account_id is not null
  and public.user_can_manage_account(account_id)
);

drop policy if exists "Account managers can update content calendar plans" on public.content_calendar_plans;
create policy "Account managers can update content calendar plans"
on public.content_calendar_plans for update
to authenticated
using (
  account_id is not null
  and public.user_can_manage_account(account_id)
)
with check (
  account_id is not null
  and public.user_can_manage_account(account_id)
);

drop policy if exists "Account managers can delete content calendar plans" on public.content_calendar_plans;
create policy "Account managers can delete content calendar plans"
on public.content_calendar_plans for delete
to authenticated
using (
  account_id is not null
  and public.user_can_manage_account(account_id)
);

drop policy if exists "Account members can view content calendar items" on public.content_calendar_items;
create policy "Account members can view content calendar items"
on public.content_calendar_items for select
to authenticated
using (
  account_id is not null
  and public.user_can_view_account(account_id)
);

drop policy if exists "Account managers can insert content calendar items" on public.content_calendar_items;
create policy "Account managers can insert content calendar items"
on public.content_calendar_items for insert
to authenticated
with check (
  account_id is not null
  and public.user_can_manage_account(account_id)
);

drop policy if exists "Account managers can update content calendar items" on public.content_calendar_items;
create policy "Account managers can update content calendar items"
on public.content_calendar_items for update
to authenticated
using (
  account_id is not null
  and public.user_can_manage_account(account_id)
)
with check (
  account_id is not null
  and public.user_can_manage_account(account_id)
);

drop policy if exists "Account managers can delete content calendar items" on public.content_calendar_items;
create policy "Account managers can delete content calendar items"
on public.content_calendar_items for delete
to authenticated
using (
  account_id is not null
  and public.user_can_manage_account(account_id)
);

-- Quality reviews and decisions do not originally have account_id columns.
-- Scope them through their linked generated_assets row so reviews saved by MASTER are visible
-- to legitimate account users, and account users cannot read or mutate reviews for other workspaces.

drop policy if exists "Account members can view asset quality reviews" on public.asset_quality_reviews;
create policy "Account members can view asset quality reviews"
on public.asset_quality_reviews for select
to authenticated
using (
  exists (
    select 1
    from public.generated_assets ga
    where ga.id = asset_quality_reviews.asset_id
      and ga.account_id is not null
      and public.user_can_view_account(ga.account_id)
  )
);

drop policy if exists "Account managers can insert asset quality reviews" on public.asset_quality_reviews;
create policy "Account managers can insert asset quality reviews"
on public.asset_quality_reviews for insert
to authenticated
with check (
  exists (
    select 1
    from public.generated_assets ga
    where ga.id = asset_quality_reviews.asset_id
      and ga.account_id is not null
      and public.user_can_manage_account(ga.account_id)
  )
);

drop policy if exists "Account managers can update asset quality reviews" on public.asset_quality_reviews;
create policy "Account managers can update asset quality reviews"
on public.asset_quality_reviews for update
to authenticated
using (
  exists (
    select 1
    from public.generated_assets ga
    where ga.id = asset_quality_reviews.asset_id
      and ga.account_id is not null
      and public.user_can_manage_account(ga.account_id)
  )
)
with check (
  exists (
    select 1
    from public.generated_assets ga
    where ga.id = asset_quality_reviews.asset_id
      and ga.account_id is not null
      and public.user_can_manage_account(ga.account_id)
  )
);

drop policy if exists "Account managers can delete asset quality reviews" on public.asset_quality_reviews;
create policy "Account managers can delete asset quality reviews"
on public.asset_quality_reviews for delete
to authenticated
using (
  exists (
    select 1
    from public.generated_assets ga
    where ga.id = asset_quality_reviews.asset_id
      and ga.account_id is not null
      and public.user_can_manage_account(ga.account_id)
  )
);

drop policy if exists "Account members can view quality gate decisions" on public.quality_gate_decisions;
create policy "Account members can view quality gate decisions"
on public.quality_gate_decisions for select
to authenticated
using (
  exists (
    select 1
    from public.generated_assets ga
    where ga.id = quality_gate_decisions.asset_id
      and ga.account_id is not null
      and public.user_can_view_account(ga.account_id)
  )
);

drop policy if exists "Account managers can insert quality gate decisions" on public.quality_gate_decisions;
create policy "Account managers can insert quality gate decisions"
on public.quality_gate_decisions for insert
to authenticated
with check (
  exists (
    select 1
    from public.generated_assets ga
    where ga.id = quality_gate_decisions.asset_id
      and ga.account_id is not null
      and public.user_can_manage_account(ga.account_id)
  )
);

drop policy if exists "Account managers can update quality gate decisions" on public.quality_gate_decisions;
create policy "Account managers can update quality gate decisions"
on public.quality_gate_decisions for update
to authenticated
using (
  exists (
    select 1
    from public.generated_assets ga
    where ga.id = quality_gate_decisions.asset_id
      and ga.account_id is not null
      and public.user_can_manage_account(ga.account_id)
  )
)
with check (
  exists (
    select 1
    from public.generated_assets ga
    where ga.id = quality_gate_decisions.asset_id
      and ga.account_id is not null
      and public.user_can_manage_account(ga.account_id)
  )
);

notify pgrst, 'reload schema';
