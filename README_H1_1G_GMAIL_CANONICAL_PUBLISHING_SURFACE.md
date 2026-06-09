# VIP H1.1G Gmail Canonical Publishing Surface Patch

## Purpose

This patch fixes the Gmail/email gap found during H1.1 testing.

Observed behavior:

```text
Email did not publish/create a Gmail draft.
No Zapier MCP execution appeared.
No tool_runs row appeared.
```

That means email was not reaching a real execution lane from the visible UI. The correct fix is not to revive legacy `tool_runs`; it is to make email assets use the canonical ZapierMCP publishing route just like LinkedIn and Facebook.

## Files included

```text
src/lib/publishing/output-payload.ts
src/components/ready-for-publishing/ReadyAssetActions.tsx
src/components/publishing/ExecuteApprovedAssetButton.tsx
src/components/publishing/PublishingScheduleActions.tsx
src/app/(app)/assets/[assetId]/page.tsx
docs/GMAIL_CANONICAL_PUBLISHING.md
README_H1_1G_GMAIL_CANONICAL_PUBLISHING_SURFACE.md
```

## What changed

### 1. Email assets are now canonical ZapierMCP assets

The UI now treats this asset type as executable through the canonical route:

```text
email
```

alongside:

```text
linkedin_post
facebook_post
```

### 2. Gmail-specific params are now structured

Before this patch, `email` assets fell through to generic params. Now VIP sends Gmail draft fields as structured params:

```text
subject
body
body_plain
email_body
message
content
draft_only
create_draft_only
send: false
```

This avoids the old mistake where field values lived only in instructions.

### 3. Email creates a draft only

The canonical instruction is explicit:

```text
Create a Gmail draft only. Do not send the email.
```

### 4. The visible surfaces now expose email execution

- `/assets/[assetId]` shows a Gmail draft execution button for approved email assets.
- `/publishing-ready?asset=...` can now be reached for approved email assets.
- `/publishing-schedule` includes a controlled payload preview link.

## What this does not do

```text
No database migration
No route deletion
No legacy tool_runs revival
No automatic sending of email
No account/RLS change
```

## Test checklist

1. Open an approved `email` asset.
2. Confirm the asset detail page shows `Create Gmail Draft via ZapierMCP`.
3. Open `/publishing-ready?asset=<assetId>` and confirm the payload preview includes `subject`, `body`, and `draft_only: true`.
4. Execute the email asset.
5. Confirm Zapier MCP history shows a Gmail execution.
6. Confirm Gmail has a draft.
7. Confirm VIP creates a `publishing_execution_runs` record and marks the execution completed.

## Suggested commit message

```text
Route email assets through canonical ZapierMCP publishing
```
