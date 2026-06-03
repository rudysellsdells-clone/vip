# VIP Phase 3B SQL Fix

## What this fixes

Supabase failed on the original Phase 3B migration with:

```text
ERROR: 42P01: invalid reference to FROM-clause entry for table "ga"
LINE 145: left join public.campaigns c on c.id = ga.campaign_id
```

The failing statement was the backfill for:

```text
public.generated_assets.account_id
```

PostgreSQL does not allow the target table alias `ga` to be referenced from that specific `LEFT JOIN ... ON` clause in an `UPDATE ... FROM` statement.

## File replaced

```text
db/migrations/20260603_phase3b_multi_account_workspaces.sql
```

## Change made

The generated assets backfill now uses a correlated subquery:

```sql
update public.generated_assets ga
set account_id = coalesce(
  (
    select c.account_id
    from public.campaigns c
    where c.id = ga.campaign_id
    limit 1
  ),
  a.id
)
from public.accounts a
where ga.account_id is null
  and ga.user_id = a.owner_user_id;
```

## How to use

Use this corrected SQL instead of the previous Phase 3B SQL file.

If Supabase rolled back the failed run, just run this full corrected migration.

If Supabase partially applied some statements before the error, this migration is still written mostly with `if not exists`, `drop policy if exists`, and `create or replace`, so rerunning should be safe for the intended Phase 3B foundation.
