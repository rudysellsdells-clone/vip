# VIP LinkedIn record_id success guard fix

## What this fixes

LinkedIn now publishes successfully through Zapier MCP, but VIP still shows:

```text
ZapierMCP asked for more information instead of confirming execution
```

The returned LinkedIn response contains:

```json
{
  "results": {
    "record_id": "urn:li:share:7467966409398980608",
    "url": "https://www.linkedin.com/feed/update/urn:li:share:7467966409398980608/",
    "status": "PUBLISHED",
    "message": "Record created successfully"
  }
}
```

That is a successful publish.

The previous success guard recognized fields like `id`, `post_id`, and `postId`, but it did not explicitly recognize LinkedIn/Zapier's `record_id` field. It could also check for follow-up/preview indicators before honoring clear publish evidence.

## File replaced

```text
src/lib/publishing/mcp-result-guard.ts
```

## What changed

- Treats `record_id` and `recordId` as created-object evidence.
- Treats `record_id` and `Record created successfully` as success text evidence.
- Checks for strong success evidence before throwing the "asked for more information" false-negative.
- Keeps actual error detection first, so real errors are still blocked.

## Expected result after deploy

After publishing to LinkedIn, VIP should stop showing:

```text
ZapierMCP asked for more information instead of confirming execution
```

and should mark the asset as sent/published successfully when Zapier returns `record_id`, `url`, `status: "PUBLISHED"`, and `message: "Record created successfully"`.
