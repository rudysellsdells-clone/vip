# VIP H1.2D Provider Success Evidence Guard Patch

## What this fixes

VIP could show a publishing run as completed even when:

- nothing appeared on LinkedIn
- no Zapier MCP history entry existed
- the database row only proved that VIP built `mcpRequestArguments`

The app should not mark publishing completed unless the MCP response includes remote provider proof.

## Files included

```text
src/lib/publishing/mcp-result-guard.ts
src/lib/publishing/publishing-execution-service.ts
docs/H1_2D_PROVIDER_SUCCESS_EVIDENCE_GUARD.md
README_H1_2D_PROVIDER_SUCCESS_EVIDENCE_GUARD.md
```

## Behavior change

A successful publish now requires provider evidence such as:

```text
results.record_id
results.url
status: PUBLISHED
status: CREATED
lifecycleState: PUBLISHED
```

VIP no longer treats local request arguments, post text, asset IDs, campaign IDs, destination IDs, or public URLs inside post copy as proof of publishing.

## Runtime impact

No database migration.
No UI change.
No Zapier payload change.
No LinkedIn company ID change.
No Gmail or Facebook payload change.

This only tightens the completion guard and stores provider evidence when success is real.

## Testing

After deploy:

1. Publish one fresh LinkedIn asset.
2. Confirm Zapier MCP history shows an execution.
3. Confirm LinkedIn shows the post.
4. Confirm VIP marks completed.
5. If Zapier MCP is not hit, VIP should fail the run instead of marking completed.

## Suggested commit message

```text
Require provider evidence before completing publishing runs
```
