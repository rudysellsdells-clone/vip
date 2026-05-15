# Sprint 5.3 Facebook Zapier Error and Page Param Fix

## Issue

Zapier returned this tool output:

```json
{
  "isError": true,
  "error": "Unsupported get request. Object with ID 'Web Search Professionals' does not exist..."
}
```

But VIP stored the tool run as `completed`.

There are two problems:

1. Zapier was using `Web Search Professionals` as the Facebook Page object value.
2. VIP was not detecting nested Zapier tool errors where `isError = true`.

## Diagnosis

`Web Search Professionals` is the public display name/header.

The Facebook Page URL handle is:

```text
mccormick.web.marketing
```

But Facebook Graph needs the actual Page object value. If we do not have the true numeric Page ID yet, the safest next value to test is:

```bash
ZAPIER_FACEBOOK_PAGE_ID=mccormick.web.marketing
```

Do not use:

```bash
ZAPIER_FACEBOOK_PAGE_ID=Web Search Professionals
```

## What This Patch Does

### 1. Detect Zapier nested errors

Updates:

```text
src/lib/zapier/mcp-client.ts
```

VIP now inspects the MCP tool result. If Zapier returns:

```json
{
  "isError": true
}
```

VIP throws an error and the tool run becomes:

```text
failed
```

instead of:

```text
completed
```

### 2. Pass structured Facebook params

Updates:

```text
src/app/api/zapier/facebook-post/execute/route.ts
```

The route now passes structured params to Zapier MCP:

```json
{
  "page": "value from ZAPIER_FACEBOOK_PAGE_ID",
  "message": "approved Facebook post content"
}
```

It also tells Zapier not to use the display name `Web Search Professionals` as the Page field.

## Required Vercel Variables

For the next test, use:

```bash
ZAPIER_FACEBOOK_PAGE_NAME=mccormick.web.marketing
ZAPIER_FACEBOOK_PAGE_ID=mccormick.web.marketing
```

If Facebook still rejects that, we need the true numeric Page ID or the exact Zapier dropdown value.

## Files Included

```text
src/lib/zapier/mcp-client.ts
src/app/api/zapier/facebook-post/execute/route.ts
```

## Apply

1. Replace both files.
2. Commit.
3. Push.
4. Redeploy Vercel.

Suggested commit message:

```text
Fix Facebook Zapier error handling and page param
```

## Test

1. Prepare a fresh Facebook Zapier action from an approved `facebook_post`.
2. Click **Publish to Locked Facebook Page**.
3. If it succeeds, confirm the post appears.
4. If it fails, check `tool_runs.error`.

## Expected Improvement

If Facebook rejects the Page value again, the tool run should now show:

```text
status = failed
error = actual Zapier/Facebook error
```

not:

```text
status = completed
output.isError = true
```
