# VIP Publishing Route Classification

## Purpose

This document records the current publishing-route decision for the H1 hardening sprint.

The goal is to prevent new publishing work from creating additional execution lanes while we consolidate the existing routes safely.

## Canonical social publishing route

For approved LinkedIn and Facebook social assets, the canonical execution route is:

```text
POST /api/publishing/assets/[assetId]/execute-zapier-mcp
```

This route is responsible for:

- validating the asset is approved, active, and latest-version
- building structured Zapier MCP params
- calling Zapier MCP through `execute_zapier_write_action`
- requiring real success evidence before marking an asset sent/published
- writing success/failure activity log records

## Legacy webhook route

The old webhook route remains in the repo for backward compatibility:

```text
POST /api/publishing/assets/[assetId]/send-to-zapier
```

As of H1.1, it is deprecated for social publishing.

For these asset types, the route returns HTTP 410 and does not call a webhook:

```text
linkedin_post
facebook_post
```

This prevents social posts from being sent through the wrong lane and prevents false local completion states.

## Compatibility routes still under review

These routes are not removed in H1.1:

```text
/api/tool-runs/[toolRunId]/execute
/api/zapier/facebook-post/execute
/api/zapier/gmail-draft/execute
/api/zapier/prepare-action
/api/assets/[assetId]/prepare-linkedin-post
/api/assets/[assetId]/prepare-facebook-post
/api/assets/[assetId]/prepare-facebook-page-post
/api/asset-exports/[exportId]/gmail-draft/execute
```

They should be classified during H1.2 before deletion or deeper refactoring.

## Development rule

New publishing behavior must go through the canonical publishing execution service or the current canonical route. Do not add new direct Zapier MCP clients, direct webhook sends, or route-specific success parsing unless the architecture decision is updated first.
