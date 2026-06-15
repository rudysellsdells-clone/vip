# VIP H1.2E Zapier MCP Execute-Now Patch

## What this fixes

Zapier MCP returned a `followUpQuestion` asking whether VIP wanted field mapping confirmation or a simulated response instead of actually executing the LinkedIn company update.

H1.2D correctly blocked the false success. H1.2E addresses the next layer: making the MCP write request unambiguously an execution request.

## File included

```text
src/lib/mcp/mcp-write-clients.ts
```

## Behavior change

Every Zapier MCP write call now sends a stronger instruction envelope:

```text
EXECUTE THE ZAPIER WRITE ACTION NOW.
This is not a preview, simulation, field-mapping review, or confirmation request.
Do not ask a follow-up question when params are present.
Return real provider response only after execution.
```

The output request also requires JSON after execution and says not to return `followUpQuestion`.

## What this does not change

```text
No LinkedIn company ID change
No output-payload param change
No route change
No UI change
No database migration
No success guard change
```

## Test after deploy

1. Reset or use a fresh approved LinkedIn post.
2. Publish through VIP.
3. Confirm Zapier MCP history shows a LinkedIn execution.
4. Confirm LinkedIn shows the post.
5. Confirm VIP marks completed only if provider evidence is returned.

## Suggested commit message

```text
Force Zapier MCP write calls to execute instead of preview
```
