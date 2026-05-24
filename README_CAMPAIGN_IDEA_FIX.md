# VIP Monthly Campaign Generator — Campaign Idea Fix

## Problem

Generation failed with:

```text
null value in column "idea" of relation "campaigns" violates not-null constraint
```

## Cause

Your `campaigns` table requires:

```text
idea
```

Earlier patches made the campaign insert minimal, but they did not include the required `idea` column.

## Fix

This patch updates:

```text
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
```

The campaign insert now includes:

```text
idea
```

The value is built from:

```text
campaign name + weekly campaign angle
```

Example:

```text
June 2026 Week 1: Authority Growth: Educate the audience on the core problem and why it matters now.
```

## Files Included

```text
src/app/api/content-calendar/monthly-campaigns/generate/route.ts
db/migrations/20260524_campaign_idea_generator_fields.sql
README_CAMPAIGN_IDEA_FIX.md
```

## SQL

Run this optional schema-cache refresh migration:

```text
db/migrations/20260524_campaign_idea_generator_fields.sql
```

It does not add `idea` because your database already has it. It only ensures the other generator fields exist and refreshes Supabase/PostgREST.

## Apply

1. Replace the route file.
2. Run optional SQL.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Populate campaign idea in monthly generator
```

## Test

1. Clear June test data if needed.
2. Open:

```text
/content-calendar/monthly?month=2026-06
```

3. Generate June campaigns again.
4. Expected result:

```text
Created 5 campaign(s) and 65 asset(s)
```

or, depending on usable weeks:

```text
Created 4 campaign(s) and 52 asset(s)
```
