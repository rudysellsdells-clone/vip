# Gmail Canonical Publishing Standard

Email assets should not use legacy `tool_runs` as their primary execution lane.

## Canonical behavior

Approved `email` assets should execute through:

```text
/api/publishing/assets/[assetId]/execute-zapier-mcp
```

The action should create a Gmail draft only.

## Required params

VIP should send email values in structured `params`, not only inside instructions:

```text
subject
body
body_plain
email_body
message
content
draft_only
create_draft_only
send: false
```

## UI surfaces

Approved email assets should be executable from:

```text
/assets/[assetId]
/publishing-ready?asset=[assetId]
/publishing-schedule
```

## Legacy note

Older Gmail draft `tool_runs` may still exist for What-If PDF exports or previous action prep flows. They should be treated as compatibility paths, not the primary publishing route for normal monthly campaign email assets.
