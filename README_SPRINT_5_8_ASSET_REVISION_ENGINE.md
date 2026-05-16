# Sprint 5.8 Asset Revision Engine

## Goal

Allow Rudy to revise one generated asset without regenerating the whole campaign.

## Why This Sprint

The workflow now supports:

```text
Generate → Review → Approve → Execute → Audit
```

Sprint 5.8 adds the missing refinement loop:

```text
Generate → Review → Revise → Review Again → Approve → Execute
```

## What This Adds

### 1. Revision Generator

Adds:

```text
src/lib/ai/revision-generator.ts
```

This helper:

- Loads Rudy's digital clone context
- Uses revision instructions
- Calls OpenAI if `OPENAI_API_KEY` exists
- Falls back safely if OpenAI is unavailable
- Returns revised title, revised content, revision summary, and clone memory snapshot

### 2. Revise API Route

Adds or replaces:

```text
src/app/api/assets/[assetId]/revise/route.ts
```

This route:

1. Requires authentication
2. Loads the source asset
3. Blocks direct revision of `published` or `sent` assets
4. Loads campaign context
5. Generates a revised version using clone memory
6. Inserts a new `generated_assets` row
7. Sets `parent_asset_id` to the original asset
8. Increments `version`
9. Sets new asset status to `needs_review`
10. Updates original asset status to `revision_requested`
11. Creates an approval record
12. Logs activity

### 3. Revision Button

Adds:

```text
src/components/assets/RequestRevisionButton.tsx
```

This adds a revision instruction form and calls the new revise route.

### 4. Asset Detail Page

Adds:

```text
src/app/(app)/assets/[assetId]/page.tsx
```

This page shows:

- Asset content
- Current status
- Version
- Campaign link
- Approval actions
- Revision form
- Parent asset
- Child revision history
- Approval activity

### 5. Approval Queue Upgrade

Updates:

```text
src/app/(app)/approvals/page.tsx
```

The approval queue now includes:

- Revision request form
- Version number
- Link to asset detail page
- Revision history access

## No Database Migration Needed

This sprint uses existing fields:

```text
generated_assets.version
generated_assets.parent_asset_id
generated_assets.status
generated_assets.metadata
approvals.status
activity_log
```

## Apply

1. Copy files into repo.
2. Commit.
3. Push.
4. Let Vercel redeploy.

Suggested commit message:

```text
Add asset revision engine
```

## Test

1. Generate a new campaign asset pack.
2. Go to `/approvals`.
3. Pick one asset.
4. Click **Request Revision**.
5. Enter instructions, such as:
   ```text
   Make this more direct, add a stronger CTA, and make it sound more like Rudy.
   ```
6. Submit.
7. Confirm a new asset appears with:
   ```text
   status = needs_review
   version = previous version + 1
   parent_asset_id = original asset id
   ```
8. Confirm the original asset becomes:
   ```text
   status = revision_requested
   ```
9. Open `/assets/[assetId]`.
10. Confirm revision history appears.
11. Approve the revised asset.
12. Prepare and execute as usual.

## Success Criteria

Sprint 5.8 is complete when Rudy can revise one asset, review the revised version, and approve only the version he wants to execute.
