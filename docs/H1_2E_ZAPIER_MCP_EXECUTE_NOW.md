# H1.2E Zapier MCP Execute-Now Envelope

## Purpose

Force VIP's Zapier MCP write calls to be treated as execution requests, not preview, field-mapping, simulation, or confirmation requests.

## Problem found

After H1.2D correctly stopped false success, LinkedIn publishing returned a Zapier MCP response with `followUpQuestion` asking whether VIP wanted field mapping confirmation or a simulated API response.

That proves the request reached the MCP server, but the MCP layer did not execute the connected LinkedIn write action.

## Root cause

VIP was sending the right app/action/params, but the natural-language instruction envelope was still loose enough for the MCP layer to interpret the request as a confirmation/preview task instead of an execution task.

## What changed

`src/lib/mcp/mcp-write-clients.ts` now wraps every write action instruction with a stronger execution envelope:

- execute the Zapier write action now
- not a preview
- not a simulation
- not a field-mapping review
- do not ask follow-up questions when params are present
- return an explicit error if the connected app refuses execution
- return provider evidence only after execution

The output request now explicitly asks for JSON after execution and forbids `followUpQuestion` responses.

## Files changed

```text
src/lib/mcp/mcp-write-clients.ts
```

## Runtime impact

No database migration.
No UI change.
No payload-builder change.
No publishing guard change.
No provider action key change.

This only changes the instruction/output envelope sent to Zapier MCP.

## Expected behavior

If Zapier MCP executes:

```json
{"results":{"record_id":"...","url":"...","status":"PUBLISHED","message":"..."}}
```

If Zapier MCP cannot execute:

```json
{"error":"...","status":"failed"}
```

It should no longer ask whether VIP wants a preview or simulated response.
