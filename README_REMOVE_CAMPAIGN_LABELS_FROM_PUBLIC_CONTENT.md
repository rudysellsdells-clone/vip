# VIP Remove Campaign Labels From Public Content

## Problem

Generated content still included internal campaign labels like:

```text
# June 2026 Week 1:
```

That should not appear inside publishable content.

It is fine for campaign names, internal metadata, calendar grouping, and review boards, but not in the asset body that gets published.

## What This Fix Does

### Monthly generator

Replaces:

```text
src/lib/content-calendar/monthly-campaign-planner.ts
```

The planner now separates:

```text
internal campaign name
public topic
public title
public content
private generation prompt
```

Generated asset titles and bodies now use public-facing titles like:

```text
Why AI Search Visibility Matters for Local Businesses
```

Instead of:

```text
June 2026 Week 1: Authority Growth — AI search visibility
```

### Public content cleaner

Updates:

```text
src/lib/content/public-content-cleaner.ts
```

It now strips campaign labels from resubmitted/regenerated content too.

### Cleanup SQL

For existing generated content, run:

```text
db/migrations/20260524_remove_campaign_labels_from_generated_content.sql
```

This removes lines like:

```text
# June 2026 Week 1: ...
Week 1: ...
```

from existing `generated_assets.content`.

## Files Included

```text
src/lib/content-calendar/monthly-campaign-planner.ts
src/lib/content/public-content-cleaner.ts
db/migrations/20260524_remove_campaign_labels_from_generated_content.sql
README_REMOVE_CAMPAIGN_LABELS_FROM_PUBLIC_CONTENT.md
```

## Apply

1. Replace the monthly campaign planner.
2. Replace the public content cleaner.
3. Optional but recommended: run the cleanup SQL.
4. Commit.
5. Push.
6. Redeploy.

Suggested commit message:

```text
Remove campaign labels from public content
```

## Test

1. Generate a clean month.
2. Open blog, social, email, and video assets.
3. Confirm content does not include:
   - `# June 2026 Week 1`
   - `June 2026 Week`
   - `Week 1:`
4. Confirm the campaign/review board can still group assets by campaign and week.
5. Confirm social posts still include emoji and hashtags.
