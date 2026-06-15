# VIP H1.2F LinkedIn Known Success Shape and MCP Envelope Correction Patch

## What this fixes

This patch uses the last known-good LinkedIn Zapier MCP output as the truth source.

The successful LinkedIn response came back as:

```json
{
  "0": {
    "id": "urn:li:share:...",
    "url": "https://www.linkedin.com/feed/update/urn:li:share:.../",
    "lifecycleState": "PUBLISHED"
  }
}
```

H1.2D did the right thing by requiring provider evidence, but it did not yet recognize that numeric-keyed shape. H1.2E also appears too aggressive because it can trigger an AI-assistant refusal instead of execution.

## Files included

```text
src/lib/publishing/mcp-result-guard.ts
src/lib/publishing/publishing-execution-service.ts
src/lib/mcp/mcp-write-clients.ts
docs/H1_2F_LINKEDIN_KNOWN_SUCCESS_SHAPE_AND_MCP_ENVELOPE_CORRECTION.md
README_H1_2F_LINKEDIN_KNOWN_SUCCESS_SHAPE_AND_MCP_ENVELOPE_CORRECTION.md
```

## Behavior change

The guard now accepts known-good LinkedIn provider evidence in these forms:

```text
results.record_id / results.url / results.status
0.id / 0.url / 0.lifecycleState
array[0].id / array[0].url / array[0].lifecycleState
```

It still rejects request-only and preview/follow-up responses.

## H1.2E correction

`src/lib/mcp/mcp-write-clients.ts` is restored to the pre-H1.2E request style. The forced execution envelope is removed because it produced MCP responses saying the assistant could not execute external APIs.

## Suggested commit message

```text
Accept LinkedIn numeric success response and soften MCP write envelope
```
