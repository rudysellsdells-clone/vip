# VIP H1.1F MCP Success Guard Content Text Fix

## Purpose

This patch fixes a false failure after a successful LinkedIn publish.

Zapier MCP returned a real success payload:

```json
{
  "results": {
    "record_id": "urn:li:share:...",
    "url": "https://www.linkedin.com/feed/update/...",
    "status": "PUBLISHED",
    "message": "Record created and published successfully"
  }
}
```

But VIP returned:

```text
ZapierMCP returned an error-like response
```

## Root cause

The MCP result guard scanned the entire serialized response for broad error phrases like:

```text
is missing
failed
unable to
cannot
```

That is too aggressive for social content because the public post body can legitimately contain phrases like:

```text
If your business is missing...
what may be missing?
```

So VIP classified successful content as an error simply because the post text contained normal marketing language.

## File replaced

```text
src/lib/publishing/mcp-result-guard.ts
```

## What changed

The guard now:

1. Checks explicit MCP error fields first:
   - `error`
   - `isError: true`
   - `raw.error`
   - `raw.result.isError`
   - parsed text error objects

2. Accepts nested success evidence:
   - `results.record_id`
   - `results.url`
   - `status: PUBLISHED`
   - `lifecycleState: PUBLISHED`
   - success text like `Record created and published successfully`

3. Stops treating broad words inside the approved post body as errors.

## What this does not change

- No Zapier payload changes
- No LinkedIn destination changes
- No database migration
- No UI changes
- No route changes

## Expected result

When LinkedIn publishes and Zapier returns `record_id`, `url`, and `status: PUBLISHED`, VIP should now mark the publish as successful instead of returning an error.

## Test checklist

1. Publish an approved LinkedIn post.
2. Confirm it lands on the correct LinkedIn page.
3. Confirm VIP returns success.
4. Confirm the asset is marked sent/published.
5. Confirm `/actions` and `/zapier` show the execution as completed.

## Suggested commit message

```text
Fix MCP success guard false error on published social content
```
