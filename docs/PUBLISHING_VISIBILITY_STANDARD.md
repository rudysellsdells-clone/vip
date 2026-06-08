# Publishing Visibility Standard

## Purpose

VIP has two different execution record types:

```text
publishing_execution_runs = canonical publishing audit trail
tool_runs = legacy / compatibility action audit trail
```

## Source of truth by page

### `/publishing-schedule`

Shows approved assets that are eligible for publishing work.

This is the working queue.

### `/actions`

Shows execution history across systems.

It should display:

- Canonical publishing executions from `publishing_execution_runs`
- Legacy action records from `tool_runs`

### `/zapier`

Shows Zapier-specific execution history.

It should display:

- Canonical ZapierMCP publishing executions from `publishing_execution_runs`
- Legacy Zapier MCP tool runs from `tool_runs`
- Zapier action policies

## Engineering rule

New publishing execution should create or update `publishing_execution_runs`.

Legacy `tool_runs` may remain for compatibility, but new social publishing should not depend on tool runs for visibility.
