# VIP TypeScript Zapier MCP Social Publish Fix

This is the TypeScript/Next.js version of the Zapier MCP social publishing fix.

Your project structure confirms this is a Next.js TypeScript project because it has:

```text
next-env.d.ts
next.config.ts
package.json
tailwind.config.ts
tsconfig.json
vercel.json
```

Do not use the PHP patch for this repo.

---

## Issues fixed

### 1. Facebook false failure

Facebook published successfully, but VIP treated the response as an error.

The successful Zapier MCP response looked like this:

```json
{
  "results": {
    "id": "30489698262_1777565287102827",
    "url": null,
    "status": null,
    "message": null
  }
}
```

That should count as success because `results.id` is present.

---

### 2. LinkedIn wrong action key

LinkedIn failed with:

```text
Action 'execute_zapier_write_action' not found
```

That means VIP was using the executor/tool name as the LinkedIn action key.

Wrong:

```ts
action: "execute_zapier_write_action"
```

Correct for LinkedIn Page publishing:

```ts
action: "create_company_update"
```

Correct structure:

```text
Executor/tool: execute_zapier_write_action
App: LinkedIn
Action: create_company_update
```

For general LinkedIn sharing, use:

```text
share
```

---

## Files

```text
src/lib/zapierMcpSocialActions.ts
src/lib/zapierMcpPublishResponse.ts
examples/next-api-route/route.ts
README.md
```

---

## Install

Copy these two files into your repo:

```text
src/lib/zapierMcpSocialActions.ts
src/lib/zapierMcpPublishResponse.ts
```

If your project uses a different source alias, adjust imports as needed.

---

## Find the bug

Search the VIP repo for:

```text
execute_zapier_write_action
```

If you see it used as an action value, that is the issue.

Bad:

```ts
const action = "execute_zapier_write_action";
```

Good:

```ts
const executor = "execute_zapier_write_action";
const action = "create_company_update";
```

---

## Correct LinkedIn Page action

Use:

```text
create_company_update
```

Do not use:

```text
execute_zapier_write_action
```

as the LinkedIn action.

---

## Correct Facebook success handling

Use:

```ts
const normalized = normalizeZapierMcpPublishResponse(zapierResponse, "Facebook");

if (normalized.success) {
  return {
    success: true,
    message: normalized.message,
    postId: normalized.postId,
    postUrl: normalized.postUrl,
    executionId: normalized.executionId,
    feedbackUrl: normalized.feedbackUrl,
  };
}
```

---

## Correct LinkedIn payload

Use:

```ts
const payload = buildSocialPublishPayload({
  channel: "linkedin_page",
  message: postBody,
});
```

This resolves to:

```ts
{
  executor: "execute_zapier_write_action",
  app: "LinkedIn",
  action: "create_company_update",
  params: {
    message: postBody
  }
}
```

---

## Notes

The example route is intentionally not a full replacement for your existing route. It shows where to plug in the two fixes:

1. Build the correct app/action payload.
2. Normalize the Zapier MCP response so `results.id` counts as success.
