# Tool Runs Audit Diagnostic Fix

## Problem

The What-If PDF Gmail draft is created successfully, but nothing appears in `tool_runs`.

## What This Patch Does

Updates:

```text
src/app/api/asset-exports/[exportId]/gmail-draft/execute/route.ts
```

The route now tries multiple likely `tool_runs` insert payload shapes:

```text
primary_tool_runs_payload
fallback_without_metadata
alternate_tool_provider_error_message
minimal_tool_runs_payload
legacy_action_type_payload
```

If all fail, it records the exact insert errors into:

```text
asset_exports.metadata.toolRunsAudit
activity_log.metadata.toolRunsAudit
```

It also tries to read one existing `tool_runs` row to capture available sample keys, if RLS allows it.

## Why This Is Needed

The previous patch tried to insert into `tool_runs`, but the insert likely failed because the actual `tool_runs` schema is different from the assumed payload.

This patch stops hiding that failure.

## Apply

1. Replace the included route file.
2. Commit.
3. Push.
4. Redeploy.

Suggested commit message:

```text
Diagnose What-If Gmail tool run audit insert
```

## Test

1. Open `/what-if-stories`.
2. Create the Gmail draft again.
3. Confirm the draft appears in Gmail.
4. Check the latest `asset_exports.metadata.toolRunsAudit`.

If `toolRunsAudit.ok = true`, the record inserted.

If `toolRunsAudit.ok = false`, send the contents of:

```text
toolRunsAudit
```

especially:

```text
attempts
sample
```

Then we can make the final exact schema patch.

## Expected Next Step

Once we see the real insert error or sample column names, the final patch will use the exact `tool_runs` schema instead of guessing.
