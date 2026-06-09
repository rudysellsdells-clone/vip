# H1.2B Publishing Preflight Service

## Status

H1.2B continues publishing consolidation after H1.1 stabilized the working provider paths and H1.2 introduced the service foundation.

## Purpose

The goal is to keep moving publishing behavior out of route handlers and into the shared publishing execution service without changing confirmed working behavior.

## What belongs in the service after this patch

The shared service now owns these publishing preflight concepts:

```text
published/sent duplicate check
approved/latest/active check
normalized asset state response
LinkedIn destination-lock validation
asset channel/destination mapping
publishing execution run lifecycle helpers
```

## What the route should still own for now

The canonical route still owns:

```text
authentication
asset lookup
account publishing settings attachment
payload building
ZapierMCP execution
MCP result guard call
asset sent/published update
activity log writes
HTTP response formatting
```

Those can move gradually in later H1.2 patches.

## Why this is low risk

This is a refactor of where rules live, not a change to the rules themselves.

The route still returns the same duplicate-publishing error, the same approved/latest/active error, and the same LinkedIn destination-lock error.

## Next recommended H1.2 slice

The next safe slice is likely activity-log writing or asset status update orchestration.

Do not move payload building and provider calls in the same patch unless there is a clear test window.
