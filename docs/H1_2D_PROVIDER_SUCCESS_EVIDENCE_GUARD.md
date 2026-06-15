# H1.2D Provider Success Evidence Guard

## Purpose

Prevent VIP from marking a publishing execution completed when it only has local request arguments and no remote provider success evidence.

## Problem found

A LinkedIn publishing attempt showed a completed VIP run with metadata containing `mcpRequestArguments`, but nothing appeared in LinkedIn and no Zapier MCP history entry existed.

That means VIP had proof that it built a request, but not proof that Zapier MCP executed the request or that LinkedIn created a share.

## Root cause

The MCP success guard was too broad. It walked the full returned object and could treat nested local/request-side values as success evidence.

Local request metadata can include fields such as:

```text
asset_id
campaign_id
company_id
comment
content
instructions
```

Those fields prove VIP prepared a request. They do not prove a remote post or draft was created.

## What changed

The guard now requires remote provider evidence before completion.

Acceptable success evidence includes:

```text
results.record_id
results.id
results.url
status: PUBLISHED
status: CREATED
lifecycleState: PUBLISHED
```

For Zapier MCP responses, the guard prioritizes parsed provider payloads such as:

```text
raw.result.content[].text -> JSON -> results
parsedText.results
```

It no longer treats `requestArguments`, `params`, `mcpRequestArguments`, public post text, asset IDs, campaign IDs, or destination IDs as publish success evidence.

## Expected behavior after patch

If Zapier MCP does not return provider success evidence:

```text
VIP marks the publishing execution failed
VIP does not mark the asset published/sent
VIP returns a clear diagnostic message
```

If Zapier MCP returns real provider evidence:

```text
VIP marks the execution completed
VIP marks the asset sent/published
VIP stores provider evidence in execution metadata
```

## Important note

This patch prevents future false-completed publishing attempts. It does not automatically repair assets that were already incorrectly marked completed before this patch.

For an already-misclassified asset, use a fresh asset for testing or manually reset the asset/run if needed.
