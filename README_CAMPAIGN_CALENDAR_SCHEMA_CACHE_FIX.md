# VIP Campaign Calendar Schema Cache Fix

## Problem

Monthly campaign generation failed with:

```text
Created 0 campaign(s) and 0 asset(s).

Could not find the 'calendar_notes' column of 'campaigns' in the schema cache
```

## Cause

The campaign-aware calendar sprint added new columns, including:

```text
campaigns.calendar_notes
```

Supabase/PostgREST sometimes keeps an old schema cache after a migration. The database may have the column, but the API layer still rejects inserts until its schema cache refreshes.

There is also no reason for this route to depend on `campaigns.calendar_notes` directly because we already store that same information inside campaign metadata.

## Fix

This patch replaces:

```text
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
```

The route no longer inserts into:

```text
campaigns.calendar_notes
```

Instead it stores the notes safely in:

```text
metadata.calendarNotes
```

## Optional SQL

If you still see schema cache errors on any other newly added column, run:

```text
db/migrations/20260524_refresh_postgrest_schema_cache.sql
```

It contains:

```sql
notify pgrst, 'reload schema';
```

## Files Included

```text
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
db/migrations/20260524_refresh_postgrest_schema_cache.sql
README_CAMPAIGN_CALENDAR_SCHEMA_CACHE_FIX.md
```

## Apply

1. Replace the route file.
2. Optional: run the schema cache refresh SQL.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Fix monthly campaign schema cache issue
```

## Test

1. Open:

```text
/content-calendar/monthly
```

2. Generate monthly campaigns for June.
3. Confirm campaigns and assets are created.
4. Confirm June appears in the dropdown.
5. Confirm the calendar boxes populate.
