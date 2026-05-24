# VIP Schema-Safe June Calendar Repair

## Problem

The previous repair SQL failed with:

```text
ERROR: 42703: column "title" does not exist
```

## Cause

Your `campaigns` table does not have a `title` column. It likely uses `name`.

The SQL referenced `title` directly, so Postgres failed before it could repair anything.

## Fix

This patch provides a schema-safe repair SQL that does not reference `campaigns.title` directly.

Instead, it uses:

```sql
to_jsonb(c)::text
```

to search the whole campaign row safely.

## Files Included

```text
db/migrations/20260524_schema_safe_june_calendar_repair.sql
src/lib/content-calendar/campaign-aware-monthly-calendar.ts
README_SCHEMA_SAFE_JUNE_CALENDAR_REPAIR.md
```

## Apply

1. Run this SQL in Supabase:

```text
db/migrations/20260524_schema_safe_june_calendar_repair.sql
```

2. Replace:

```text
src/lib/content-calendar/campaign-aware-monthly-calendar.ts
```

3. Commit, push, redeploy.

Suggested commit message:

```text
Repair June calendar without title column
```

## What It Does

The SQL:

```text
adds missing calendar fields
finds June 2026 campaigns without using title directly
marks recent monthly generator campaigns as June when needed
assigns week numbers
sets June week start/end dates
copies campaign context to assets
assigns sort orders
assigns planned publish dates
assigns scheduled publish times
refreshes Supabase schema cache
```

## Important

The calendar helper also continues to block the bad fallback behavior:

```text
generated assets no longer use created_at as calendar display date
```

That prevents all generated items from piling onto today's date again.
