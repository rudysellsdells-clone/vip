# VIP Campaign + Asset Archive Cleanup

## Goal

Keep completed/deleted campaigns and their generated assets out of working pages without destroying history.

## What This Adds

### SQL migration

```text
db/migrations/20260523_campaign_asset_archive.sql
```

Adds archive fields to:

```text
campaigns
generated_assets
```

### API routes

```text
src/app/api/campaigns/[campaignId]/archive/route.ts
src/app/api/campaigns/[campaignId]/restore/route.ts
src/app/api/campaigns/[campaignId]/delete/route.ts
src/app/api/assets/[assetId]/archive/route.ts
src/app/api/assets/[assetId]/restore/route.ts
```

Important behavior:

```text
Delete Campaign now archives the campaign instead of hard-deleting it.
Archiving a campaign also archives generated_assets tied to that campaign_id.
Restoring a campaign restores assets tied to that campaign_id.
Individual orphaned assets can be archived/restored.
```

### Archive page

```text
/archive
```

Shows:

```text
Archived campaigns
Archived assets
Active orphan campaign assets
```

The orphan section helps clean up assets left behind by earlier hard-deleted campaigns.

## SQL Required

Run this in Supabase:

```text
db/migrations/20260523_campaign_asset_archive.sql
```

## Important Next Step

This patch creates the archive system. To hide archived records from all working pages, add this filter to working queries:

```ts
.is("archived_at", null)
```

Recommended pages to check:

```text
/campaigns
/approvals
/publishing-ready
/content-repurposing
/authority-content
/phase-two
/dashboard
```

## Apply

1. Add/replace included files.
2. Run SQL migration.
3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Add campaign and asset archive cleanup
```

## Test

1. Open `/archive`.
2. Archive an orphan asset if one appears.
3. Restore it to confirm restore works.
4. Archive a campaign.
5. Confirm assets tied to that campaign are archived.
6. Restore the campaign.
7. Confirm tied assets restore.
