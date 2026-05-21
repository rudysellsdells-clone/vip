# Zapier Gmail Draft V2 Fix

## Problem

The What-If PDF Gmail execution saved metadata showing:

```text
Action 'gmail_create_draft' not found for app 'gmail'
```

Zapier MCP returned the available Gmail actions:

```text
add_label
archive_email
delete_email
draft_v2
draft_v2_reply
label
message
remove_label
remove_thread_label
reply_to_message
```

## Cause

The route defaulted to:

```bash
ZAPIER_GMAIL_CREATE_DRAFT_ACTION=gmail_create_draft
```

but your enabled Gmail draft action is:

```bash
draft_v2
```

## Fix

This patch updates the default action to:

```bash
draft_v2
```

and improves the Zapier MCP client so tool-level errors are not accidentally marked completed.

## Files Updated

```text
src/lib/zapier/mcp-write-client.ts
src/app/api/asset-exports/[exportId]/gmail-draft/execute/route.ts
.env.example
```

## Vercel Environment Variable

Set this in Vercel:

```bash
ZAPIER_GMAIL_CREATE_DRAFT_ACTION=draft_v2
```

Keep:

```bash
ZAPIER_GMAIL_APP=gmail
```

## Apply

1. Replace included files.
2. Update Vercel env var:

```bash
ZAPIER_GMAIL_CREATE_DRAFT_ACTION=draft_v2
```

3. Commit.
4. Push.
5. Redeploy.

Suggested commit message:

```text
Fix Gmail draft Zapier action key
```

## Test

1. Open `/what-if-stories`.
2. Use a story that already has a PDF and Gmail draft prep.
3. Enter recipient email.
4. Click **Create Gmail Draft**.
5. Confirm the draft appears in Gmail.
6. Confirm `asset_exports.status = completed`.

## Notes

This patch also fixes false-completed records. If Zapier returns `isError: true`, VIP now throws the error and marks the export as failed.
