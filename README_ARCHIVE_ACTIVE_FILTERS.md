# VIP Archive Active Filters

## Goal

Now that campaigns and assets can be archived, active workflows need to respect that archive state.

This patch adds a helper and updates the repurposing route so archived source assets cannot be reused by accident.

## Files Included

```text
src/lib/archive/query-filters.ts
src/app/api/assets/[assetId]/repurpose/route.ts
docs/ARCHIVE_FILTER_QUERY_SNIPPETS.md
README_ARCHIVE_ACTIVE_FILTERS.md
```

## What Changed

The repurposing route now requires:

```ts
.is("archived_at", null)
```

So archived assets cannot be repurposed by URL.

## No SQL Required

This depends on the archive migration from the prior patch:

```text
db/migrations/20260523_campaign_asset_archive.sql
```

## Manual Follow-Up

Because older core pages may have changed over time, this patch does not overwrite Campaigns, Approvals, Dashboard, or Actions.

Use the snippets in:

```text
docs/ARCHIVE_FILTER_QUERY_SNIPPETS.md
```

to add:

```ts
.is("archived_at", null)
```

to active campaign and generated asset queries.

## Suggested Commit Message

```text
Hide archived assets from active workflows
```

## Test

1. Archive an asset from `/archive`.
2. Confirm it still appears in `/archive`.
3. Try to repurpose the archived asset by URL.
4. Confirm the route returns:

```text
Source asset not found or has been archived.
```

5. Add `.is("archived_at", null)` to core active page queries.
6. Confirm archived campaigns/assets disappear from working views.
