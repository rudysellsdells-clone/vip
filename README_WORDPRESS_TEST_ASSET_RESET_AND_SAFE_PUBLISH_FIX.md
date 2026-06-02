# VIP WordPress Test Asset Reset + Safe Publish Fix

## Problem

After a failed/terminated WordPress MCP attempt, VIP now thinks the test asset has already been published and blocks another send.

The test asset from the payload is:

```text
7bffa0ec-e24c-4457-bba9-62dfa09bcef7
```

## What This Patch Includes

```text
sql/reset_wordpress_test_asset_for_republish.sql
src/lib/publishing/mcp-result-guard.ts
src/app/api/publishing/assets/[assetId]/execute-zapier-mcp/route.ts
README_WORDPRESS_TEST_ASSET_RESET_AND_SAFE_PUBLISH_FIX.md
```

## SQL Reset

Run:

```text
sql/reset_wordpress_test_asset_for_republish.sql
```

This sets the test asset back to:

```text
status = approved
published_at = null
published_via = null
published_reference = null
```

## Route Safety Change

The execution route now:

```text
logs send started
calls ZapierMCP
checks the MCP result for error/terminated/failed markers
only marks the asset sent/published after confirmed success
logs send failed without changing asset publish state
blocks duplicate sends unless the asset is intentionally reset
```

## Apply

1. Extract this ZIP directly to repo root.
2. Run the SQL reset in Supabase.
3. Commit.
4. Redeploy.
5. Retest the WordPress asset.

Suggested commit message:

```text
Prevent failed MCP sends from marking assets published
```
