# What-If Gmail Tool Run Audit Fix

## Problem

The What-If PDF Gmail draft is working, and `asset_exports` is saving the result, but the action does not appear in the recent Zapier actions area.

## Cause

The execution route was updating:

```text
asset_exports
activity_log
```

but it was not inserting a matching record into the existing Zapier/action audit table:

```text
tool_runs
```

The recent Zapier actions area likely reads from `tool_runs`.

## Fix

This patch updates:

```text
src/app/api/asset-exports/[exportId]/gmail-draft/execute/route.ts
```

It now writes a `tool_runs` record for both:

```text
completed
failed
```

runs.

## Behavior

After creating a Gmail draft through Zapier, VIP now records:

```text
provider: zapier_mcp
tool_name: gmail.draft_v2
status: completed
source_asset_id: <asset id>
input: recipient, subject, attachment URL, params
output: Zapier result
```

If the draft fails, it records:

```text
status: failed
error: <error message>
```

## Apply

1. Replace the included route file.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Record What-If Gmail drafts in Zapier actions
```

## Test

1. Open `/what-if-stories`.
2. Use an existing story with PDF and Gmail prep.
3. Create the Gmail draft again.
4. Confirm it appears in Gmail.
5. Check recent Zapier actions.
6. Confirm the action appears as a Gmail/Zapier run.

## Note

Existing drafts created before this patch will not appear retroactively in recent Zapier actions unless we add a backfill script later.
