# VIP MCP Confirmed Success Guard Fix

## Problem

VIP marked a Facebook asset published, but no ZapierMCP run appeared.

That means the execution route still treated a non-error MCP response as success, even though we did not receive clear proof that Zapier actually created/published anything.

## What This Patch Does

Adds a stricter MCP result guard.

VIP now refuses to mark an asset sent/published when the MCP response contains:

```text
followUpQuestion
isPreview
error
terminated
failed
not found
required field
missing field
invalid input
```

VIP also requires clear success evidence, such as:

```text
id
post_id
url
permalink
success: true
ok: true
created / posted / published / successfully text
```

## Files Included

```text
src/lib/publishing/mcp-result-guard.ts
src/app/api/publishing/assets/[assetId]/execute-zapier-mcp/route.ts
sql/reset_facebook_test_asset_for_republish.sql
README_MCP_CONFIRMED_SUCCESS_GUARD_FIX.md
```

## Reset SQL

The SQL resets this Facebook test asset:

```text
cf19d1a3-61ba-4a1d-b540-9f5063053f95
```

back to approved/unscheduled so it can be tested again.

## Apply

1. Extract this ZIP directly to repo root.
2. Run:

```text
sql/reset_facebook_test_asset_for_republish.sql
```

3. Commit.
4. Redeploy.
5. Retest the Facebook post.

Suggested commit message:

```text
Require confirmed MCP success before publishing assets
```
