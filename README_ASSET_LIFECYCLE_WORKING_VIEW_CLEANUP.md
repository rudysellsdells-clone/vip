# VIP Asset Lifecycle / Working View Cleanup

## Product Rule

Working screens should show only the latest active version of an asset.

Working screens include:

```text
/content-calendar/monthly
/content-quality
/quality-automation
/approvals
/publishing-schedule
/publishing-ready
```

They should exclude:

```text
archived assets
superseded assets
inactive versions
published assets
Zapier-sent assets
```

## What This Patch Adds

```text
db/migrations/20260601_asset_lifecycle_visibility_cleanup.sql
src/lib/assets/asset-visibility.ts
src/lib/assets/asset-lifecycle.ts
src/app/api/publishing/assets/[assetId]/mark-published/route.ts
README_ASSET_LIFECYCLE_WORKING_VIEW_CLEANUP.md
```

## Lifecycle Rules

### When a quality resubmission creates a new asset

The original asset should be updated:

```text
is_active_version = false
superseded_by_asset_id = new asset id
replaced_at = now()
archived_at = now()
archive_reason = quality_resubmission_created
```

The new asset should be:

```text
is_active_version = true
parent_asset_id = original root asset id
archived_at = null
```

Use:

```ts
import { supersedeAssetVersion, prepareNewAssetVersion } from "@/lib/assets/asset-lifecycle";
```

After inserting the new regenerated asset:

```ts
const parentAssetId = originalAsset.parent_asset_id ?? originalAsset.id;

await prepareNewAssetVersion({
  supabase,
  userId: user.id,
  newAssetId: newAsset.id,
  parentAssetId,
});

await supersedeAssetVersion({
  supabase,
  userId: user.id,
  originalAssetId: originalAsset.id,
  newAssetId: newAsset.id,
  reason: "quality_resubmission_created",
});
```

## Calendar / Review / Approval Query Rule

On working pages, use:

```ts
import { applyWorkingAssetQuery, filterWorkingAssets } from "@/lib/assets/asset-visibility";
```

Example:

```ts
const query = applyWorkingAssetQuery(
  supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
);

const { data } = await query;

const assets = filterWorkingAssets(Array.isArray(data) ? data : []);
```

This should be applied to:

```text
/content-calendar/monthly
/content-quality
/quality-automation
/approvals
```

## Publishing Schedule Rule

`/publishing-schedule` should only show:

```text
status = approved
is_active_version = true
archived_at is null
superseded_by_asset_id is null
status != published
scheduling_status != published
published_at is null
```

Use:

```ts
import { applyPublishingScheduleQuery, filterPublishingScheduleAssets } from "@/lib/assets/asset-visibility";
```

Example:

```ts
const query = applyPublishingScheduleQuery(
  supabase
    .from("generated_assets")
    .select("*")
    .eq("user_id", user.id)
);

const { data } = await query;

const assets = filterPublishingScheduleAssets(Array.isArray(data) ? data : []);
```

## Zapier Success Rule

After Zapier successfully receives/publishes an asset, call:

```text
POST /api/publishing/assets/[assetId]/mark-published
```

Payload:

```json
{
  "provider": "zapier",
  "reference": "optional Zapier run id or response id"
}
```

This updates the asset:

```text
status = published
scheduling_status = published
published_at = now()
published_via = zapier
published_reference = optional value
```

Once this happens, the asset leaves `/publishing-schedule`.

## Published Page

Recommended next page:

```text
/published
```

Query:

```ts
supabase
  .from("generated_assets")
  .select("*")
  .eq("user_id", user.id)
  .or("status.eq.published,scheduling_status.eq.published,published_at.not.is.null")
  .order("published_at", { ascending: false, nullsFirst: false });
```

## Test

1. Generate a month.
2. Run quality review on one asset.
3. Request resubmission.
4. Confirm the original asset disappears from:
   - monthly calendar
   - review/scoring pages
   - approval page
   - publishing schedule
5. Confirm only the regenerated asset remains visible.
6. Approve the regenerated asset.
7. Confirm it appears on `/publishing-schedule`.
8. Push it to Zapier.
9. Call the mark-published endpoint after Zapier success.
10. Confirm it disappears from `/publishing-schedule`.
11. Confirm it appears in `/published` or archive/history.
