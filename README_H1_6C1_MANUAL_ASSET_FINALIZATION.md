# H1.6C1 — Manual Asset Finalization

This patch adds a human editing step to the asset detail workflow.

## What changed

- Adds an **Edit Final Copy** button on `/assets/[assetId]`.
- Opens an inline editor for the asset title and content.
- Saves edits as a new child version instead of overwriting the generated asset.
- Sets the edited version to `needs_review` so it can be approved before publishing.
- Moves the parent asset to `revision_requested` and stores metadata pointing to the latest manual edit.
- Writes approval records and an activity log entry for audit history.

## Files included

```text
README_H1_6C1_MANUAL_ASSET_FINALIZATION.md
src/app/(app)/assets/[assetId]/page.tsx
src/app/api/assets/[assetId]/manual-edit/route.ts
src/components/assets/ManualAssetEditForm.tsx
```

## Database changes

No SQL changes are required. This reuses the existing `generated_assets`, `approvals`, and `activity_log` tables.

## How to apply

Unzip this package directly into the repo root and choose **Replace** when prompted.
