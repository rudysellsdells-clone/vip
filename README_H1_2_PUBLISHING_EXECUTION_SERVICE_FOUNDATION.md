# VIP H1.2 Publishing Execution Service Foundation Patch

## Purpose

This patch starts H1.2 by creating the canonical publishing execution service boundary.

It is a conservative refactor. The goal is to keep the H1.1-verified behavior intact while moving low-risk execution-run lifecycle logic out of the route.

## Files included

```text
src/lib/publishing/publishing-execution-service.ts
src/app/api/publishing/assets/[assetId]/execute-zapier-mcp/route.ts
docs/H1_2_PUBLISHING_EXECUTION_SERVICE_FOUNDATION.md
README_H1_2_PUBLISHING_EXECUTION_SERVICE_FOUNDATION.md
```

## What moved into the service

```text
isAlreadySentOrPublished
publishingChannelForAsset
publishingDestinationForAsset
publishingExecutionReferenceFromMcpResult
createPublishingExecutionRun
completePublishingExecutionRun
failPublishingExecutionRun
```

## What stayed in the route

The route still owns the currently working H1.1 publishing flow:

```text
auth
asset lookup
account publishing settings attachment
approval/active/latest-version checks
LinkedIn destination lock
payload building
ZapierMCP execution
MCP result guard
asset status update
activity logs
```

## Risk level

Low-to-medium.

This does touch the canonical publishing route, but it only extracts execution-run helper code. It does not change payloads, provider calls, database schema, or UI behavior.

## Test after deploy

Run this exact validation:

```text
1. LinkedIn publish
2. Gmail draft
3. Facebook publish
4. Confirm each marks completed in VIP
5. Confirm /actions and /zapier still show execution history
```

## Rollback

If any channel regresses, replace:

```text
src/app/api/publishing/assets/[assetId]/execute-zapier-mcp/route.ts
```

with the pre-H1.2 version and remove:

```text
src/lib/publishing/publishing-execution-service.ts
```

## Suggested commit message

```text
Add publishing execution service foundation
```
