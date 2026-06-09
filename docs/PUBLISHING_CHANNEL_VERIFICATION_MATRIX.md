# Publishing Channel Verification Matrix

## Purpose

This document tracks the current state of VIP's outbound publishing channels after H1.1 stabilization.

## Current source of truth

The canonical execution route is:

```text
/api/publishing/assets/[assetId]/execute-zapier-mcp
```

The primary work queue is:

```text
/publishing-schedule
```

Execution/audit visibility should appear in:

```text
/actions
/zapier
```

## Verified channels

| Channel | Asset type | Provider | Expected action | Verified | Notes |
|---|---|---|---|---:|---|
| LinkedIn Company Page | `linkedin_post` | ZapierMCP | Create LinkedIn Company Update | Yes | Requires real LinkedIn organization/company ID. |
| Facebook Page | `facebook_post` | ZapierMCP | Create Facebook Page Post | Yes | Canonical button/path visible after H1.1B. |
| Gmail Draft | `email` | ZapierMCP | Create Gmail Draft | Yes | Draft-only behavior. Does not auto-send. |

## Required LinkedIn destination fields

LinkedIn publishing must use a real organization ID, not only a page label.

Valid examples:

```text
1650652
urn:li:organization:1650652
```

Invalid example:

```text
McCormick Web Marketing
```

The display/page name may still be stored and shown as:

```text
McCormick Web Marketing
```

But the actual publish params must include a real ID.

## Required Gmail behavior

Gmail execution should create a draft only.

Expected structured params include:

```text
subject
body
body_plain
email_body
message
content
draft_only: true
create_draft_only: true
send: false
```

## Required success evidence

A provider result should only be marked completed when it contains real success evidence.

Examples:

```text
results.id
results.record_id
results.url
status: PUBLISHED
lifecycleState: PUBLISHED
Record created and published successfully
```

## Known non-goals

H1.1 did not:

- delete legacy publishing routes
- fully consolidate publishing logic
- complete RLS hardening
- replace all `untypedSupabase` usage
- complete GalaxyAI image publishing validation

Those belong to later hardening phases.
