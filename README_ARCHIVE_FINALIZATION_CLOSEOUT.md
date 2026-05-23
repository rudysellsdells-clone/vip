# VIP Archive Finalization Closeout

## Goal

Finish the archive cleanup so we can move on.

This patch makes the archive safer and easier to use:

- Adds bulk orphan campaign asset cleanup
- Blocks archived assets from repurposing
- Blocks archived assets from publishing execution
- Adds reusable archive query helpers
- Includes snippets for filtering older active pages

## Files Included

```text
src/lib/archive/query-filters.ts
src/app/api/archive/orphan-campaign-assets/route.ts
src/components/archive/BulkArchiveOrphanAssetsButton.tsx
src/app/api/assets/[assetId]/repurpose/route.ts
src/app/api/publishing/assets/[assetId]/execute/route.ts
docs/ARCHIVE_FILTER_QUERY_SNIPPETS.md
README_ARCHIVE_FINALIZATION_CLOSEOUT.md
```

## Manual Add to Archive Page

If you want the bulk orphan button visible on `/archive`, import:

```tsx
import { BulkArchiveOrphanAssetsButton } from "@/components/archive/BulkArchiveOrphanAssetsButton";
```

Then add this near the Active Orphan Campaign Assets section:

```tsx
<BulkArchiveOrphanAssetsButton disabled={activeOrphanAssets.length === 0} />
```

## No SQL Required

This depends on the prior archive migration already being run:

```text
db/migrations/20260523_campaign_asset_archive.sql
```

## What Is Now Protected

### Repurposing

Archived assets cannot be repurposed.

### Publishing Ready

Archived assets cannot be executed.

### Orphan Cleanup

The new route can bulk archive orphan campaign assets:

```text
POST /api/archive/orphan-campaign-assets
```

## Remaining One-Time Cleanup

For older core pages where we do not want to risk overwriting active code, add:

```ts
.is("archived_at", null)
```

to active queries.

Use:

```text
docs/ARCHIVE_FILTER_QUERY_SNIPPETS.md
```

Recommended pages:

```text
/campaigns
/approvals
/dashboard
/actions
```

## Apply

1. Add/replace included files.
2. Optionally add the bulk button to `/archive`.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Finalize archive cleanup protections
```

## Test

1. Archive an asset.
2. Try to repurpose it by direct route and confirm it fails.
3. Try to execute it by direct route and confirm it fails.
4. Use the orphan bulk archive endpoint/button if needed.
5. Confirm active pages are clean after adding filters.
